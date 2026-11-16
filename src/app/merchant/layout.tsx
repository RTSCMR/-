import { requireRole } from "@/lib/auth";
import { syncExpiredCampaigns } from "@/lib/workflow";
import { Shell } from "@/components/shell";

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("MERCHANT");
  await syncExpiredCampaigns();
  return (
    <Shell home="/merchant" name={user.storeName || user.name} roleLabel="تاجر"
      items={[
        { href: "/merchant", label: "حملاتي", exact: true },
        { href: "/merchant/campaigns/new", label: "حملة جديدة" },
        { href: "/merchant/account", label: "حسابي" },
      ]}>
      {children}
    </Shell>
  );
}
