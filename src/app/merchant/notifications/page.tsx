import { requireRole } from "@/lib/auth";
import { NotificationsList } from "@/components/notifications";

export const metadata = { title: "التنبيهات" };

export default async function Notifications() {
  const user = await requireRole("MERCHANT");
  return <NotificationsList user={user} />;
}
