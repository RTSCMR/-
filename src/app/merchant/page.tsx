import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { C, P } from "@/lib/status";
import { effectiveCpm } from "@/lib/money";
import { campaignTotals } from "@/lib/workflow";
import { Empty, Gauge, Num, PageTitle, Sar, Section, Stat } from "@/components/ui";
import { CampaignCard } from "@/components/campaign-bits";

export const metadata = { title: "حملاتي" };

export default async function MerchantHome() {
  const user = await requireRole("MERCHANT");
  const campaigns = await db.campaign.findMany({ where: { merchantId: user.id }, include: { participations: true }, orderBy: { createdAt: "desc" } });
  const rows = campaigns.map((c) => ({ c, t: campaignTotals(c, c.participations) }));
  const live = rows.filter((r) => r.c.status !== C.CANCELLED);
  const spent = live.reduce((a, r) => a + r.t.gross, 0);
  const cap = live.reduce((a, r) => a + r.c.budgetHalalas, 0);
  const views = live.reduce((a, r) => a + r.t.approvedViews, 0);
  const ecpm = effectiveCpm(spent, views);
  const due = rows.filter((r) => r.c.status === C.COMPLETED && r.t.balance > 0).reduce((a, r) => a + r.t.balance, 0);

  return (
    <>
      <PageTitle title="حملاتي" action={<Link href="/merchant/campaigns/new" className="btn btn-flame">حملة جديدة</Link>} />

      {campaigns.length === 0 ? (
        <Empty>
          <p className="mb-4 text-ink">ما عندك حملات للحين. أول حملة تاخذ دقيقتين.</p>
          <Link href="/merchant/campaigns/new" className="btn btn-flame">أنشئ أول حملة</Link>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-6 border-y-[1.5px] border-ink lg:grid-cols-4">
            <Stat label="المشاهدات المعتمدة" accent><Num n={views} /></Stat>
            <Stat label="المصروف" sub={<>من سقف <Sar h={cap} className="text-sm text-ink" /></>}><Sar h={spent} /></Stat>
            <Stat label="تكلفة الألف الفعلية" sub="المصروف ÷ المشاهدات × 1,000">{ecpm === null ? <span className="num text-mute">—</span> : <Sar h={ecpm} />}</Stat>
            <Stat label="متبقي عليك الآن" sub="للحملات اللي انتهت وما تسوّت">{<Sar h={due} />}</Stat>
          </div>
          <div className="mt-3"><Gauge value={spent} max={cap} label="المصروف مقابل السقف" /></div>

          <Section title="كل الحملات">
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map(({ c, t }) => {
                const pending = c.participations.filter((p) => p.status === P.APPLIED || p.status === P.DRAFT_SUBMITTED).length;
                return (
                  <CampaignCard key={c.id} c={c} t={t} href={`/merchant/campaigns/${c.id}`}
                    extra={pending > 0 ? <p className="mt-3 inline-block bg-flame px-2 py-1 text-sm font-semibold text-white"><span className="num">{pending}</span> بانتظار ردّك</p> : null} />
                );
              })}
            </div>
          </Section>
        </>
      )}
    </>
  );
}
