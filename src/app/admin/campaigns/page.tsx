import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { CAMPAIGN_STATUS } from "@/lib/status";
import { campaignTotals } from "@/lib/workflow";
import { Empty, PageTitle } from "@/components/ui";
import { CampaignCard } from "@/components/campaign-bits";

export const metadata = { title: "كل الحملات" };

export default async function AdminCampaigns({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("ADMIN");
  const { status } = await searchParams;
  const filter = status && CAMPAIGN_STATUS[status] ? status : undefined;
  const campaigns = await db.campaign.findMany({ where: filter ? { status: filter } : {}, include: { participations: true, merchant: true }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageTitle title="كل الحملات" />
      <div className="mb-5 flex flex-wrap gap-2">
        {[["", "الكل"], ...Object.entries(CAMPAIGN_STATUS).map(([k, v]) => [k, v.label])].map(([v, label]) => (
          <Link key={v} href={v ? `/admin/campaigns?status=${v}` : "/admin/campaigns"}
            className={`rounded-[3px] border-[1.5px] border-ink px-3 py-1.5 text-sm font-semibold ${(filter ?? "") === v ? "bg-ink text-paper" : ""}`}>{label}</Link>
        ))}
      </div>
      {campaigns.length === 0 ? <Empty>ما فيه حملات بهذي الحالة.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} c={c} t={campaignTotals(c, c.participations)} href={`/admin/campaigns/${c.id}`}
              extra={<p className="mt-3 text-sm font-semibold">{c.merchant.storeName || c.merchant.name}</p>} />
          ))}
        </div>
      )}
    </>
  );
}
