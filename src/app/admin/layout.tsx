import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { C, P } from "@/lib/status";
import { syncExpiredCampaigns } from "@/lib/workflow";
import { Shell } from "@/components/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  await syncExpiredCampaigns();
  const [c, p] = await Promise.all([
    db.campaign.count({ where: { status: { in: [C.DEPOSIT_REPORTED, C.COMPLETED] } } }),
    db.participation.count({ where: { status: { in: [P.VIEWS_SUBMITTED, P.VIEWS_APPROVED] } } }),
  ]);
  return (
    <Shell home="/admin" name={user.name} roleLabel="مشرف"
      items={[
        { href: "/admin", label: "الرئيسية", exact: true, badge: c + p },
        { href: "/admin/campaigns", label: "الحملات" },
        { href: "/admin/payments", label: "التحويلات" },
        { href: "/admin/settings", label: "الإعدادات" },
      ]}>
      {children}
    </Shell>
  );
}
