import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FlowError } from "./workflow";

export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./uploads");
const MAX = 5 * 1024 * 1024;

const SIGNATURES: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
  { ext: "png", mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg", mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "webp", mime: "image/webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
];

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(SIGNATURES.map((s) => [s.ext, s.mime]));

/** يحفظ لقطة الشاشة باسم عشوائي بعد التأكد من نوعها الفعلي (مو الامتداد اللي أرسله المتصفح). */
export async function saveScreenshot(file: unknown): Promise<string> {
  if (!(file instanceof File) || file.size === 0) throw new FlowError("ارفع لقطة شاشة من إحصائيات الفيديو.");
  if (file.size > MAX) throw new FlowError("حجم الصورة أكبر من 5 ميجا.");
  const buf = Buffer.from(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(buf));
  if (!sig) throw new FlowError("الصورة لازم تكون PNG أو JPG أو WebP.");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(16).toString("hex")}.${sig.ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), buf);
  return name;
}
