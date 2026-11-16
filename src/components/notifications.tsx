import Link from "next/link";
import type { User } from "@prisma/client";
import { loadNotifications } from "@/lib/notifications";
import { statusLabel } from "@/lib/status";
import { Empty, PageTitle, formatDate } from "./ui";

export async function NotificationsList({ user }: { user: User }) {
  const items = await loadNotifications(user);
  const merchant = user.role === "MERCHANT";
  return (
    <>
      <PageTitle title="التنبيهات" sub="كل جديد على حملاتك ومشاركاتك." />
      {items.length === 0 ? <Empty>ما فيه تنبيهات للحين.</Empty> : (
        <ul className="border-[1.5px] border-ink bg-card">
          {items.map((e, i) => {
            const href = merchant
              ? `/merchant/campaigns/${e.campaignId}${e.participationId ? `#p-${e.participationId}` : ""}`
              : `/creator/participations/${e.participationId}`;
            const who = merchant && e.participation ? `${e.participation.creator.name}: ` : "";
            return (
              <li key={e.id} className={i ? "border-t border-line" : ""}>
                <Link href={href} className={`flex items-start gap-3 px-4 py-3 hover:bg-white ${e.isNew ? "border-s-4 border-flame" : "border-s-4 border-transparent"}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{who}{statusLabel(e.participationId ? "participation" : "campaign", e.toStatus)}</span>
                    {e.note && <span className="block break-words text-[0.95rem]">{e.note}</span>}
                    <span className="hint block">{e.campaign.productName} · {formatDate(e.createdAt, true)}</span>
                  </span>
                  {e.isNew && <span className="mt-1 whitespace-nowrap rounded-[3px] bg-flame px-1.5 py-0.5 text-xs font-semibold text-white">جديد</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
