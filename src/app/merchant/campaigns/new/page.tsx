import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PageTitle } from "@/components/ui";
import { CampaignForm } from "@/components/campaign-form";

export const metadata = { title: "حملة جديدة" };

export default async function NewCampaign() {
  const user = await requireRole("MERCHANT");
  const s = await getSettings();
  return (
    <>
      <PageTitle title="حملة جديدة" sub="حدد وش تبي وكم تدفع على كل ألف مشاهدة." />
      <CampaignForm depositPercent={s.depositPercent} commissionPercent={s.commissionPercent} defaultStoreUrl={user.storeUrl ?? ""} />
    </>
  );
}
