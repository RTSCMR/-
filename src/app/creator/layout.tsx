import { requireRole } from "@/lib/auth";
import { syncExpiredCampaigns } from "@/lib/workflow";
import { unreadCount } from "@/lib/notifications";
import { Shell } from "@/components/shell";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("CREATOR");
  await syncExpiredCampaigns();
  const unread = await unreadCount(user);
  return (
    <Shell home="/creator" name={user.name} roleLabel="صانع محتوى"
      items={[
        { href: "/creator", label: "مشاركاتي", exact: true },
        { href: "/creator/campaigns", label: "الحملات" },
        { href: "/creator/notifications", label: "التنبيهات", badge: unread },
        { href: "/creator/profile", label: "ملفي" },
      ]}>
      {children}
    </Shell>
  );
}
