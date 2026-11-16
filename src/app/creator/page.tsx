import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { P, PLATFORMS } from "@/lib/status";
import { computeEarning, creatorCap } from "@/lib/money";
import { Empty, Num, PageTitle, Sar, Section, Stat, StatusBadge } from "@/components/ui";

export const metadata = { title: "مشاركاتي" };

const NEXT: Record<string, string> = {
  [P.ACCEPTED]: "ارفع مسودة الفيديو",
  [P.REVISION_REQUESTED]: "عدّل المسودة وارفعها",
  [P.DRAFT_APPROVED]: "انشر وحط رابط المنشور",
  [P.VIEWS_REJECTED]: "أعد رفع المشاهدات",
};

export default async function CreatorHome() {
  const user = await requireRole("CREATOR");
  const parts = await db.participation.findMany({ where: { creatorId: user.id }, include: { campaign: true }, orderBy: { updatedAt: "desc" } });
  const approved = parts.filter((p) => p.status === P.VIEWS_APPROVED || p.status === P.PAID);
  const earned = approved.reduce((a, p) => a + (p.netHalalas ?? 0), 0);
  const paid = parts.filter((p) => p.status === P.PAID).reduce((a, p) => a + (p.netHalalas ?? 0), 0);
  // المعلّق: مشاهدات مرفوعة وما اعتُمدت للحين، محسوبة تقديرياً بنفس المعادلة
  const pending = parts.filter((p) => p.status === P.VIEWS_SUBMITTED).reduce((a, p) => {
    const c = p.campaign;
    return a + computeEarning(p.reportedViews ?? 0, c.cpmHalalas, creatorCap(c.budgetHalalas, c.maxCreators), c.commissionPercent).net;
  }, 0);
  const views = approved.reduce((a, p) => a + (p.approvedViews ?? 0), 0);

  return (
    <>
      <PageTitle title="مشاركاتي" action={<Link href="/creator/campaigns" className="btn btn-flame">تصفّح الحملات</Link>} />
      <div className="grid grid-cols-2 gap-x-6 border-y-[1.5px] border-ink lg:grid-cols-4">
        <Stat label="أرباح معتمدة" accent sub="صافي بعد العمولة"><Sar h={earned} /></Stat>
        <Stat label="أرباح معلّقة" sub="مشاهدات قيد المراجعة (تقدير)"><Sar h={pending} /></Stat>
        <Stat label="تحوّل لحسابك" sub={<>باقي <Sar h={earned - paid} className="text-sm text-ink" /></>}><Sar h={paid} /></Stat>
        <Stat label="مشاهدات معتمدة"><Num n={views} /></Stat>
      </div>

      <Section title="المشاركات">
        {parts.length === 0 ? (
          <Empty>
            <p className="mb-4 text-ink">ما قدّمت على أي حملة للحين.</p>
            <Link href="/creator/campaigns" className="btn btn-flame">شوف الحملات المفتوحة</Link>
          </Empty>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {parts.map((p) => (
              <li key={p.id}>
                <Link href={`/creator/participations/${p.id}`} className="card block p-4 no-underline hover:bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl">{p.campaign.productName}</h3>
                      <p className="hint">{PLATFORMS[p.campaign.platform]} · <Sar h={p.campaign.cpmHalalas} className="text-sm text-ink" /> للألف</p>
                    </div>
                    <StatusBadge kind="participation" status={p.status} />
                  </div>
                  {p.netHalalas !== null && <p className="mt-3"><span className="eyebrow">صافي مستحقك </span><Sar h={p.netHalalas} className="text-3xl" /></p>}
                  {NEXT[p.status] && <p className="mt-3 inline-block bg-flame px-2 py-1 text-sm font-semibold text-white">{NEXT[p.status]}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
