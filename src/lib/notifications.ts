import "server-only";
import type { Prisma, User } from "@prisma/client";
import { db } from "./db";

/** التنبيهات = أحداث السجل الزمني اللي تخص المستخدم وسوّاها غيره. ما فيه جدول مستقل. */
function scope(user: Pick<User, "id" | "role">): Prisma.EventWhereInput {
  const others: Prisma.EventWhereInput = { OR: [{ actorId: null }, { actorId: { not: user.id } }] };
  return user.role === "MERCHANT"
    ? { campaign: { merchantId: user.id }, ...others }
    : { participation: { creatorId: user.id }, ...others };
}

export function unreadCount(user: Pick<User, "id" | "role" | "notificationsSeenAt">) {
  return db.event.count({ where: { ...scope(user), ...(user.notificationsSeenAt ? { createdAt: { gt: user.notificationsSeenAt } } : {}) } });
}

export async function loadNotifications(user: Pick<User, "id" | "role" | "notificationsSeenAt">) {
  const events = await db.event.findMany({
    where: scope(user),
    include: { campaign: { select: { productName: true } }, participation: { select: { id: true, creator: { select: { name: true } } } }, actor: { select: { role: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const seenAt = user.notificationsSeenAt;
  await db.user.update({ where: { id: user.id }, data: { notificationsSeenAt: new Date() } });
  return events.map((e) => ({ ...e, isNew: !seenAt || e.createdAt > seenAt }));
}
