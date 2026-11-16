import { requireRole } from "@/lib/auth";
import { syncExpiredCampaigns } from "@/lib/workflow";
import { Shell } from "@/components/shell";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("CREATOR");
  await syncExpiredCampaigns();
  return (
    <Shell home="/creator" name={user.name} roleLabel="صانع محتوى"
      items={[
        { href: "/creator", label: "مشاركاتي", exact: true },
        { href: "/creator/campaigns", label: "الحملات" },
        { href: "/creator/profile", label: "ملفي" },
      ]}>
      {children}
    </Shell>
  );
}
