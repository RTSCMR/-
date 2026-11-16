import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createResetLinkAction } from "@/lib/actions";
import { Empty, Num, PageTitle, formatDate } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { PasswordForm } from "@/components/password-form";

export const metadata = { title: "المستخدمين" };

export default async function Users({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  await requireRole("ADMIN");
  const { role } = await searchParams;
  const filter = role === "MERCHANT" || role === "CREATOR" ? role : undefined;
  const users = await db.user.findMany({
    where: { role: filter ?? { in: ["MERCHANT", "CREATOR"] } },
    include: { _count: { select: { campaigns: true, participations: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageTitle title="المستخدمين" sub="لو أحد نسي كلمة المرور، أنشئ له رابط استرجاع وأرسله له." />
      <div className="mb-5 flex flex-wrap gap-2">
        {[["", "الكل"], ["MERCHANT", "التجار"], ["CREATOR", "صنّاع المحتوى"]].map(([v, label]) => (
          <Link key={v} href={v ? `/admin/users?role=${v}` : "/admin/users"}
            className={`rounded-[3px] border-[1.5px] border-ink px-3 py-1.5 text-sm font-semibold ${(filter ?? "") === v ? "bg-ink text-paper" : ""}`}>{label}</Link>
        ))}
      </div>
      {users.length === 0 ? <Empty>ما فيه مستخدمين.</Empty> : (
        <ul className="border-[1.5px] border-ink bg-card">
          {users.map((u, i) => {
            const merchant = u.role === "MERCHANT";
            return (
              <li key={u.id} className={`px-4 py-3 ${i ? "border-t border-line" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {merchant ? (u.storeName ? `${u.storeName} · ${u.name}` : u.name) : <Link href={`/creators/${u.id}`} className="underline decoration-flame decoration-2">{u.name}</Link>}
                      <span className="ms-2 text-sm font-medium text-mute">{merchant ? "تاجر" : "صانع محتوى"}</span>
                    </p>
                    <p className="hint"><span dir="ltr">{u.email}</span>{u.phone ? <> · <span dir="ltr">{u.phone}</span></> : null} · سجّل {formatDate(u.createdAt)}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm text-mute">
                    <Num n={merchant ? u._count.campaigns : u._count.participations} className="text-xl text-ink" /> {merchant ? "حملة" : "مشاركة"}
                  </p>
                </div>
                <ActionForm action={createResetLinkAction} hidden={{ id: u.id }} className="mt-2">
                  <button className="text-sm font-semibold text-mute underline">رابط استرجاع كلمة المرور</button>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      )}
      <PasswordForm />
    </>
  );
}
