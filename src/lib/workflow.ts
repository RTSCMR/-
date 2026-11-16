import "server-only";
import type { Prisma, Campaign, Participation } from "@prisma/client";
import { db } from "./db";
import { C, P, FINAL_STATUSES, EARNED_STATUSES } from "./status";

type Tx = Prisma.TransactionClient;

/** خطأ يُعرض نصه للمستخدم كما هو */
export class FlowError extends Error {}

const STALE = "الحالة تغيّرت قبل شوي. حدّث الصفحة وجرّب مرة ثانية.";

/** ينقل الحملة من حالة لحالة بشرط إنها ما تغيّرت، ويكتب السجل الزمني. */
export async function moveCampaign(
  tx: Tx, c: Pick<Campaign, "id" | "status">, from: string[], to: string,
  opts: { actorId?: string | null; note?: string | null; data?: Prisma.CampaignUncheckedUpdateManyInput } = {},
) {
  if (!from.includes(c.status)) throw new FlowError(STALE);
  const r = await tx.campaign.updateMany({ where: { id: c.id, status: c.status }, data: { ...opts.data, status: to } });
  if (r.count !== 1) throw new FlowError(STALE);
  await tx.event.create({ data: { campaignId: c.id, actorId: opts.actorId ?? null, fromStatus: c.status, toStatus: to, note: opts.note || null } });
}

export async function moveParticipation(
  tx: Tx, p: Pick<Participation, "id" | "status" | "campaignId">, from: string[], to: string,
  opts: { actorId?: string | null; note?: string | null; data?: Prisma.ParticipationUncheckedUpdateManyInput } = {},
) {
  if (!from.includes(p.status)) throw new FlowError(STALE);
  const r = await tx.participation.updateMany({ where: { id: p.id, status: p.status }, data: { ...opts.data, status: to } });
  if (r.count !== 1) throw new FlowError(STALE);
  await tx.event.create({
    data: { campaignId: p.campaignId, participationId: p.id, actorId: opts.actorId ?? null, fromStatus: p.status, toStatus: to, note: opts.note || null },
  });
}

/** يقفل التقديم: الطلبات اللي ما انبتّ فيها تنرفض تلقائياً. */
export async function closeCampaign(tx: Tx, c: Pick<Campaign, "id" | "status">, actorId: string | null, note: string) {
  await moveCampaign(tx, c, [C.OPEN], C.CLOSED, { actorId, note });
  const pending = await tx.participation.findMany({ where: { campaignId: c.id, status: P.APPLIED } });
  for (const p of pending) {
    await moveParticipation(tx, p, [P.APPLIED], P.REJECTED, { actorId, note: "انقفل التقديم على الحملة" });
  }
  await maybeComplete(tx, c.id);
}

/** لو التقديم مقفل وكل المشاركات وصلت لنهايتها، الحملة تنتقل لـ«بانتظار التسوية». */
export async function maybeComplete(tx: Tx, campaignId: string) {
  const c = await tx.campaign.findUnique({ where: { id: campaignId }, include: { participations: { select: { status: true } } } });
  if (!c || c.status !== C.CLOSED) return;
  if (c.participations.every((p) => FINAL_STATUSES.includes(p.status))) {
    await moveCampaign(tx, c, [C.CLOSED], C.COMPLETED, { note: "اكتملت كل المشاركات", data: { completedAt: new Date() } });
  }
}

/** يقفل الحملات المفتوحة اللي انتهت مدتها. يُستدعى عند فتح أي لوحة تحكم. */
export async function syncExpiredCampaigns() {
  const expired = await db.campaign.findMany({ where: { status: C.OPEN, endsAt: { lt: new Date() } }, select: { id: true, status: true } });
  for (const c of expired) {
    try {
      await db.$transaction((tx) => closeCampaign(tx, c, null, "انتهت مدة الحملة"));
    } catch (e) {
      if (!(e instanceof FlowError)) throw e;
    }
  }
}

export type Totals = {
  approvedViews: number;
  gross: number; // المصروف: إجمالي ما يستحق على التاجر
  commission: number;
  net: number; // صافي مستحقات الصنّاع
  paidOut: number;
  /** موجب = على التاجر يدفعه. سالب = يرجع للتاجر. */
  balance: number;
};

type PLike = Pick<Participation, "status" | "approvedViews" | "grossHalalas" | "commissionHalalas" | "netHalalas">;

export function campaignTotals(c: Pick<Campaign, "depositHalalas" | "status">, parts: PLike[]): Totals {
  const earned = parts.filter((p) => EARNED_STATUSES.includes(p.status));
  const sum = (f: (p: PLike) => number | null) => earned.reduce((a, p) => a + (f(p) ?? 0), 0);
  const gross = sum((p) => p.grossHalalas);
  const depositHeld = c.status === C.AWAITING_DEPOSIT || c.status === C.DEPOSIT_REPORTED || c.status === C.CANCELLED ? 0 : c.depositHalalas;
  return {
    approvedViews: sum((p) => p.approvedViews),
    gross,
    commission: sum((p) => p.commissionHalalas),
    net: sum((p) => p.netHalalas),
    paidOut: parts.filter((p) => p.status === P.PAID).reduce((a, p) => a + (p.netHalalas ?? 0), 0),
    balance: gross - depositHeld,
  };
}
