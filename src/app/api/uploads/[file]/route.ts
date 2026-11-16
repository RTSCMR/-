import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { MIME_BY_EXT, UPLOAD_DIR } from "@/lib/uploads";

/** لقطات الإحصائيات خاصة: يشوفها المشرف، وصاحب المشاركة، وتاجر الحملة فقط. */
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const user = await getUser();
  if (!user || !/^[a-f0-9]{32}\.(png|jpg|webp)$/.test(file)) return new Response("Not found", { status: 404 });
  const p = await db.participation.findFirst({ where: { screenshotFile: file }, include: { campaign: { select: { merchantId: true } } } });
  const allowed = user.role === "ADMIN" || (p && (p.creatorId === user.id || p.campaign.merchantId === user.id));
  if (!allowed) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, file));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": MIME_BY_EXT[file.split(".")[1]], "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
