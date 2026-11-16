import "server-only";
import { db } from "./db";
import { C, P, statusLabel } from "./status";
import { mailEnabled, sendMail, wrapEmail } from "./mail";

// أحداث المشاركة اللي تهم التاجر، واللي تهم المشرف
const MERCHANT_CARES: string[] = [P.APPLIED, P.DRAFT_SUBMITTED, P.PUBLISHED, P.VIEWS_APPROVED, P.CANCELLED];
const ADMIN_CARES_P: string[] = [P.VIEWS_SUBMITTED];
const ADMIN_CARES_C: string[] = [C.DEPOSIT_REPORTED, C.COMPLETED];

/**
 * يرسل إيميل لكل حدث جديد في السجل الزمني لصاحب العلاقة (غير اللي سوّى الإجراء).
 * يُستدعى بعد كل إجراء عبر after() فما يأخّر الرد. لو الإيميل مو مفعّل ما يسوي شي.
 */
export async function flushEmailNotifications() {
  if (!mailEnabled()) return;
  try {
    const events = await db.event.findMany({
      where: { notifiedAt: null, createdAt: { gt: new Date(Date.now() - 2 * 3600e3) } }, // آخر ساعتين فقط، عشان ما ينرسل القديم عند أول تفعيل
      include: { campaign: { include: { merchant: true } }, participation: { include: { creator: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    if (!events.length) return;
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

    for (const e of events) {
      // نحجز الحدث أول عشان ما ينرسل مرتين لو تزامن طلبين
      const claimed = await db.event.updateMany({ where: { id: e.id, notifiedAt: null }, data: { notifiedAt: new Date() } });
      if (claimed.count !== 1) continue;

      const p = e.participation;
      const merchant = e.campaign.merchant;
      const label = statusLabel(p ? "participation" : "campaign", e.toStatus);
      const to: { email: string; url: string; title: string }[] = [];

      if (p) {
        if (e.actorId !== p.creatorId) to.push({ email: p.creator.email, url: `/creator/participations/${p.id}`, title: label });
        if (e.actorId !== merchant.id && MERCHANT_CARES.includes(e.toStatus))
          to.push({ email: merchant.email, url: `/merchant/campaigns/${e.campaignId}#p-${p.id}`, title: `${p.creator.name}: ${label}` });
        if (ADMIN_CARES_P.includes(e.toStatus))
          for (const a of admins) to.push({ email: a.email, url: `/admin/campaigns/${e.campaignId}#p-${p.id}`, title: `${p.creator.name}: ${label}` });
      } else {
        if (e.actorId !== merchant.id) to.push({ email: merchant.email, url: `/merchant/campaigns/${e.campaignId}`, title: label });
        if (ADMIN_CARES_C.includes(e.toStatus))
          for (const a of admins) if (a.id !== e.actorId) to.push({ email: a.email, url: `/admin/campaigns/${e.campaignId}`, title: `${merchant.storeName || merchant.name}: ${label}` });
      }

      for (const r of to) {
        await sendMail({
          to: r.email,
          subject: `ألف: ${r.title} — ${e.campaign.productName}`,
          html: wrapEmail({ meta: e.campaign.productName, title: r.title, body: e.note, cta: "افتح في ألف", url: base + r.url }),
        });
      }
    }
  } catch (err) {
    console.error("[notify]", err);
  }
}
