"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import {
  createSession, destroySession, getUser, hashPassword, homeFor, loginAllowed, loginFailed, loginSucceeded, verifyPassword,
} from "./auth";
import { getSettings } from "./settings";
import { C, P, PLATFORMS, SEAT_STATUSES, type Role } from "./status";
import { computeEarning, creatorCap, depositAmount, formatSar, parseIntStrict, parseSar } from "./money";
import { FlowError, campaignTotals, closeCampaign, maybeComplete, moveCampaign, moveParticipation } from "./workflow";
import { saveScreenshot } from "./uploads";

export type ActionState = { error?: string; ok?: string } | null;

// ---------- أدوات مساعدة ----------

const str = (fd: FormData, k: string, max = 2000) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};

function need(fd: FormData, k: string, label: string, max = 2000) {
  const v = str(fd, k, max);
  if (!v) throw new FlowError(`${label}: الحقل مطلوب.`);
  return v;
}

function needUrl(fd: FormData, k: string, label: string) {
  const v = need(fd, k, label, 500);
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw 0;
    return u.toString();
  } catch {
    throw new FlowError(`${label}: اكتب رابط كامل يبدأ بـ https://`);
  }
}

async function actor(...roles: Role[]) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role as Role)) throw new FlowError("ما عندك صلاحية لهذا الإجراء.");
  return user;
}

/** يشغّل الإجراء ويحوّل FlowError لرسالة تظهر في النموذج. */
async function run(fn: () => Promise<ActionState | void>, okMessage?: string): Promise<ActionState> {
  try {
    const r = await fn();
    revalidatePath("/", "layout");
    return r ?? { ok: okMessage ?? "تم." };
  } catch (e) {
    if (e instanceof FlowError) return { error: e.message };
    throw e;
  }
}

// ---------- الحساب ----------

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let role = "";
  try {
    role = str(fd, "role");
    if (role !== "MERCHANT" && role !== "CREATOR") throw new FlowError("اختر نوع الحساب.");
    const name = need(fd, "name", "الاسم", 80);
    const email = need(fd, "email", "الإيميل", 200).toLowerCase();
    const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FlowError("الإيميل غير صحيح.");
    if (password.length < 8) throw new FlowError("كلمة المرور لازم تكون 8 أحرف على الأقل.");
    if (password.length > 200) throw new FlowError("كلمة المرور طويلة جداً.");
    if (await db.user.findUnique({ where: { email } })) throw new FlowError("هذا الإيميل مسجل من قبل. جرّب تسجيل الدخول.");
    const user = await db.user.create({
      data: {
        name, email, role, passwordHash: await hashPassword(password),
        storeName: role === "MERCHANT" ? str(fd, "storeName", 80) || null : null,
        city: role === "CREATOR" ? str(fd, "city", 60) || null : null,
      },
    });
    await createSession(user.id);
  } catch (e) {
    if (e instanceof FlowError) return { error: e.message };
    throw e;
  }
  redirect(role === "CREATOR" ? "/creator/profile?welcome=1" : "/merchant");
}

let dummyHash: Promise<string> | undefined;

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email", 200).toLowerCase();
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  if (!loginAllowed(email)) return { error: "محاولات كثيرة. انتظر ربع ساعة وجرّب." };
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  // نقارن دايماً حتى لو الإيميل مو موجود، عشان وقت الرد ما يكشف وجود الحساب
  const ok = await verifyPassword(password, user?.passwordHash ?? (await (dummyHash ??= hashPassword("alf-dummy-password"))));
  if (!user || !ok) {
    loginFailed(email);
    return { error: "الإيميل أو كلمة المرور غير صحيحة." };
  }
  loginSucceeded(email);
  await createSession(user.id);
  redirect(homeFor(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("CREATOR", "MERCHANT");
    const name = need(fd, "name", "الاسم", 80);
    if (user.role === "MERCHANT") {
      await db.user.update({ where: { id: user.id }, data: { name, storeName: str(fd, "storeName", 80) || null, storeUrl: str(fd, "storeUrl", 300) || null, phone: str(fd, "phone", 20) || null } });
      return;
    }
    await db.user.update({
      where: { id: user.id },
      data: {
        name,
        city: str(fd, "city", 60) || null,
        niche: str(fd, "niche", 80) || null,
        bio: str(fd, "bio", 600) || null,
        tiktok: str(fd, "tiktok", 300) || null,
        instagram: str(fd, "instagram", 300) || null,
        snapchat: str(fd, "snapchat", 300) || null,
        portfolio: str(fd, "portfolio", 1500) || null,
        phone: str(fd, "phone", 20) || null,
        iban: str(fd, "iban", 40).replace(/\s/g, "").toUpperCase() || null,
      },
    });
  }, "انحفظ الملف.");
}

// ---------- التاجر ----------

export async function createCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  try {
    const user = await actor("MERCHANT");
    const productName = need(fd, "productName", "اسم المنتج", 120);
    const storeUrl = needUrl(fd, "storeUrl", "رابط المتجر");
    const brief = need(fd, "brief", "وصف المطلوب", 3000);
    const platform = str(fd, "platform");
    if (!PLATFORMS[platform]) throw new FlowError("اختر المنصة.");
    const cpm = parseSar(str(fd, "cpm"));
    const budget = parseSar(str(fd, "budget"));
    const durationDays = parseIntStrict(str(fd, "durationDays"));
    const maxCreators = parseIntStrict(str(fd, "maxCreators"));
    if (cpm === null || cpm < 100 || cpm > 100_000) throw new FlowError("سعر الألف مشاهدة لازم يكون بين 1 و 1,000 ريال.");
    if (budget === null || budget < 10_000 || budget > 100_000_000) throw new FlowError("سقف الميزانية لازم يكون 100 ريال على الأقل.");
    if (durationDays === null || durationDays < 3 || durationDays > 90) throw new FlowError("مدة الحملة بين 3 و 90 يوم.");
    if (maxCreators === null || maxCreators < 1 || maxCreators > 20) throw new FlowError("عدد صنّاع المحتوى بين 1 و 20.");
    if (creatorCap(budget, maxCreators) < cpm) throw new FlowError("الميزانية قليلة على هذا العدد من الصنّاع: حصة كل واحد أقل من سعر ألف مشاهدة.");
    const s = await getSettings();
    const c = await db.$transaction(async (tx) => {
      const c = await tx.campaign.create({
        data: {
          merchantId: user.id, productName, storeUrl, brief, platform,
          saudiOnly: fd.get("saudiOnly") === "on",
          cpmHalalas: cpm, budgetHalalas: budget, durationDays, maxCreators,
          depositPercent: s.depositPercent, commissionPercent: s.commissionPercent,
          depositHalalas: depositAmount(budget, s.depositPercent),
        },
      });
      await tx.event.create({ data: { campaignId: c.id, actorId: user.id, toStatus: C.AWAITING_DEPOSIT, note: "أُنشئت الحملة" } });
      return c;
    });
    id = c.id;
    revalidatePath("/", "layout");
  } catch (e) {
    if (e instanceof FlowError) return { error: e.message };
    throw e;
  }
  redirect(`/merchant/campaigns/${id}`);
}

async function ownCampaign(id: string, userId: string, isAdmin = false) {
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c || (!isAdmin && c.merchantId !== userId)) throw new FlowError("الحملة غير موجودة.");
  return c;
}

export async function reportDepositAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("MERCHANT");
    const c = await ownCampaign(str(fd, "id"), user.id);
    const reference = need(fd, "reference", "رقم الحوالة أو اسم المحوّل", 120);
    await db.$transaction((tx) =>
      moveCampaign(tx, c, [C.AWAITING_DEPOSIT], C.DEPOSIT_REPORTED, { actorId: user.id, note: `مرجع التحويل: ${reference}`, data: { depositReference: reference } }),
    );
  }, "وصلنا بلاغك. بنأكد استلام العربون وننشر الحملة.");
}

export async function cancelCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("MERCHANT", "ADMIN");
    const admin = user.role === "ADMIN";
    const c = await ownCampaign(str(fd, "id"), user.id, admin);
    const from: string[] = admin ? [C.AWAITING_DEPOSIT, C.DEPOSIT_REPORTED] : [C.AWAITING_DEPOSIT];
    if (!from.includes(c.status)) throw new FlowError(admin ? "ما تنلغي الحملة بعد تأكيد العربون. اقفل التقديم بدل الإلغاء." : "ما تقدر تلغي الحملة بعد ما بلّغت بالتحويل. تواصل مع المشرف.");
    await db.$transaction((tx) => moveCampaign(tx, c, from, C.CANCELLED, { actorId: user.id, note: str(fd, "note", 300) || null }));
  }, "انلغت الحملة.");
}

export async function closeCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("MERCHANT", "ADMIN");
    const c = await ownCampaign(str(fd, "id"), user.id, user.role === "ADMIN");
    await db.$transaction((tx) => closeCampaign(tx, c, user.id, "قفل التقديم يدوياً"));
  }, "انقفل التقديم.");
}

async function merchantParticipation(id: string, userId: string) {
  const p = await db.participation.findUnique({ where: { id }, include: { campaign: true } });
  if (!p || p.campaign.merchantId !== userId) throw new FlowError("المشاركة غير موجودة.");
  return p;
}

export async function decideApplicationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("MERCHANT");
    const p = await merchantParticipation(str(fd, "id"), user.id);
    const accept = str(fd, "decision") === "accept";
    await db.$transaction(async (tx) => {
      if (!accept) {
        await moveParticipation(tx, p, [P.APPLIED], P.REJECTED, { actorId: user.id, note: str(fd, "note", 300) || null });
        await maybeComplete(tx, p.campaignId);
        return;
      }
      if (p.campaign.status !== C.OPEN) throw new FlowError("الحملة مو مفتوحة للقبول.");
      const seats = await tx.participation.count({ where: { campaignId: p.campaignId, status: { in: SEAT_STATUSES } } });
      if (seats >= p.campaign.maxCreators) throw new FlowError(`اكتمل العدد: الحملة محددة بـ ${p.campaign.maxCreators} من صنّاع المحتوى.`);
      await moveParticipation(tx, p, [P.APPLIED], P.ACCEPTED, { actorId: user.id });
    });
  });
}

export async function reviewDraftAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("MERCHANT");
    const p = await merchantParticipation(str(fd, "id"), user.id);
    if (str(fd, "decision") === "approve") {
      await db.$transaction((tx) => moveParticipation(tx, p, [P.DRAFT_SUBMITTED], P.DRAFT_APPROVED, { actorId: user.id, data: { revisionNote: null } }));
      return;
    }
    const note = need(fd, "note", "اكتب التعديل المطلوب", 1000);
    await db.$transaction((tx) => moveParticipation(tx, p, [P.DRAFT_SUBMITTED], P.REVISION_REQUESTED, { actorId: user.id, note, data: { revisionNote: note } }));
  });
}

// ---------- صانع المحتوى ----------

export async function applyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  try {
    const user = await actor("CREATOR");
    const campaignId = str(fd, "campaignId");
    const pitch = need(fd, "pitch", "ليش أنت مناسب", 1000);
    const accountLinks = need(fd, "accountLinks", "روابط حساباتك", 800);
    const workLinks = need(fd, "workLinks", "روابط أعمالك", 800);
    const p = await db.$transaction(async (tx) => {
      const c = await tx.campaign.findUnique({ where: { id: campaignId } });
      if (!c || c.status !== C.OPEN || (c.endsAt && c.endsAt < new Date())) throw new FlowError("الحملة مو مفتوحة للتقديم.");
      if (await tx.participation.findUnique({ where: { campaignId_creatorId: { campaignId, creatorId: user.id } } })) throw new FlowError("قدّمت على هذي الحملة من قبل.");
      const p = await tx.participation.create({ data: { campaignId, creatorId: user.id, pitch, accountLinks, workLinks } });
      await tx.event.create({ data: { campaignId, participationId: p.id, actorId: user.id, toStatus: P.APPLIED } });
      return p;
    });
    id = p.id;
    revalidatePath("/", "layout");
  } catch (e) {
    if (e instanceof FlowError) return { error: e.message };
    throw e;
  }
  redirect(`/creator/participations/${id}`);
}

async function creatorParticipation(id: string, userId: string) {
  const p = await db.participation.findUnique({ where: { id }, include: { campaign: true } });
  if (!p || p.creatorId !== userId) throw new FlowError("المشاركة غير موجودة.");
  return p;
}

export async function submitDraftAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("CREATOR");
    const p = await creatorParticipation(str(fd, "id"), user.id);
    const draftUrl = needUrl(fd, "draftUrl", "رابط المسودة");
    const draftNote = str(fd, "draftNote", 600) || null;
    await db.$transaction((tx) => moveParticipation(tx, p, [P.ACCEPTED, P.REVISION_REQUESTED], P.DRAFT_SUBMITTED, { actorId: user.id, note: draftNote, data: { draftUrl, draftNote } }));
  }, "وصلت المسودة للتاجر.");
}

export async function submitPostAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("CREATOR");
    const p = await creatorParticipation(str(fd, "id"), user.id);
    const postUrl = needUrl(fd, "postUrl", "رابط المنشور");
    await db.$transaction((tx) => moveParticipation(tx, p, [P.DRAFT_APPROVED], P.PUBLISHED, { actorId: user.id, data: { postUrl, publishedAt: new Date() } }));
  }, "تسجّل النشر. يبدأ العدّ من الآن.");
}

export async function submitViewsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("CREATOR");
    const p = await creatorParticipation(str(fd, "id"), user.id);
    if (p.status !== P.PUBLISHED && p.status !== P.VIEWS_REJECTED) throw new FlowError("ما تقدر تدخل المشاهدات في هذي المرحلة.");
    const s = await getSettings();
    const due = new Date((p.publishedAt?.getTime() ?? Date.now()) + s.viewsWaitDays * 864e5);
    if (due > new Date()) throw new FlowError(`إدخال المشاهدات يفتح بعد ${s.viewsWaitDays} أيام من النشر.`);
    const views = parseIntStrict(str(fd, "views"));
    if (views === null || views > 2_000_000_000) throw new FlowError("اكتب عدد المشاهدات كرقم صحيح.");
    const screenshotFile = await saveScreenshot(fd.get("screenshot"));
    await db.$transaction((tx) =>
      moveParticipation(tx, p, [P.PUBLISHED, P.VIEWS_REJECTED], P.VIEWS_SUBMITTED, { actorId: user.id, data: { reportedViews: views, screenshotFile, viewsSubmittedAt: new Date(), reviewNote: null } }),
    );
  }, "وصلت الأرقام. المشرف يراجعها.");
}

// ---------- المشرف ----------

export async function confirmDepositAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("ADMIN");
    const c = await ownCampaign(str(fd, "id"), user.id, true);
    const reference = str(fd, "reference", 120) || c.depositReference;
    const now = new Date();
    await db.$transaction(async (tx) => {
      await moveCampaign(tx, c, [C.AWAITING_DEPOSIT, C.DEPOSIT_REPORTED], C.OPEN, {
        actorId: user.id, note: `تأكد استلام العربون ${formatSar(c.depositHalalas)} ر.س`,
        data: { openedAt: now, endsAt: new Date(now.getTime() + c.durationDays * 864e5) },
      });
      await tx.payment.create({ data: { kind: "DEPOSIT", campaignId: c.id, amountHalalas: c.depositHalalas, reference } });
    });
  }, "تأكد العربون وانتشرت الحملة.");
}

export async function reviewViewsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("ADMIN");
    const p = await db.participation.findUnique({ where: { id: str(fd, "id") }, include: { campaign: true } });
    if (!p) throw new FlowError("المشاركة غير موجودة.");
    if (str(fd, "decision") !== "approve") {
      const note = need(fd, "note", "سبب الرفض", 600);
      await db.$transaction((tx) => moveParticipation(tx, p, [P.VIEWS_SUBMITTED], P.VIEWS_REJECTED, { actorId: user.id, note, data: { reviewNote: note } }));
      return { ok: "انرفضت الأرقام ورجعت لصانع المحتوى." };
    }
    const views = parseIntStrict(str(fd, "approvedViews"));
    if (views === null) throw new FlowError("اكتب عدد المشاهدات المعتمد.");
    const cap = creatorCap(p.campaign.budgetHalalas, p.campaign.maxCreators);
    const e = computeEarning(views, p.campaign.cpmHalalas, cap, p.campaign.commissionPercent);
    const note = str(fd, "note", 600) || null;
    await db.$transaction(async (tx) => {
      await moveParticipation(tx, p, [P.VIEWS_SUBMITTED], P.VIEWS_APPROVED, {
        actorId: user.id,
        note: `اعتُمدت ${views.toLocaleString("en-US")} مشاهدة. المستحق ${formatSar(e.gross)} ر.س${e.capped ? " (وصل سقف الحصة)" : ""}${note ? ` — ${note}` : ""}`,
        data: { approvedViews: views, reviewNote: note, grossHalalas: e.gross, commissionHalalas: e.commission, netHalalas: e.net },
      });
      await maybeComplete(tx, p.campaignId);
    });
    return { ok: "اعتُمدت المشاهدات وانحسب المستحق." };
  });
}

export async function recordPayoutAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("ADMIN");
    const p = await db.participation.findUnique({ where: { id: str(fd, "id") } });
    if (!p) throw new FlowError("المشاركة غير موجودة.");
    const reference = need(fd, "reference", "رقم الحوالة", 120);
    await db.$transaction(async (tx) => {
      await moveParticipation(tx, p, [P.VIEWS_APPROVED], P.PAID, { actorId: user.id, note: `حوالة رقم ${reference}`, data: { paidAt: new Date() } });
      await tx.payment.create({ data: { kind: "PAYOUT", campaignId: p.campaignId, participationId: p.id, amountHalalas: p.netHalalas ?? 0, reference } });
    });
  }, "تسجّل التحويل.");
}

export async function settleCampaignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("ADMIN");
    const c = await db.campaign.findUnique({ where: { id: str(fd, "id") }, include: { participations: true } });
    if (!c) throw new FlowError("الحملة غير موجودة.");
    const { balance } = campaignTotals(c, c.participations);
    const reference = balance === 0 ? null : need(fd, "reference", "رقم الحوالة", 120);
    await db.$transaction(async (tx) => {
      await moveCampaign(tx, c, [C.COMPLETED], C.SETTLED, {
        actorId: user.id,
        note: balance > 0 ? `استُلم المتبقي ${formatSar(balance)} ر.س` : balance < 0 ? `رُدّ للتاجر ${formatSar(-balance)} ر.س` : "العربون غطّى المستحق كامل",
        data: { settledAt: new Date() },
      });
      if (balance !== 0) {
        await tx.payment.create({ data: { kind: balance > 0 ? "FINAL" : "REFUND", campaignId: c.id, amountHalalas: Math.abs(balance), reference } });
      }
    });
  }, "تسوّت الحملة.");
}

export async function cancelParticipationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor("ADMIN");
    const p = await db.participation.findUnique({ where: { id: str(fd, "id") } });
    if (!p) throw new FlowError("المشاركة غير موجودة.");
    const note = need(fd, "note", "سبب الإلغاء", 300);
    const from = [P.ACCEPTED, P.DRAFT_SUBMITTED, P.REVISION_REQUESTED, P.DRAFT_APPROVED, P.PUBLISHED, P.VIEWS_SUBMITTED, P.VIEWS_REJECTED];
    await db.$transaction(async (tx) => {
      await moveParticipation(tx, p, from, P.CANCELLED, { actorId: user.id, note });
      await maybeComplete(tx, p.campaignId);
    });
  }, "انلغت المشاركة.");
}

export async function updateSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await actor("ADMIN");
    const dep = parseIntStrict(str(fd, "depositPercent"));
    const com = parseIntStrict(str(fd, "commissionPercent"));
    const wait = parseIntStrict(str(fd, "viewsWaitDays"));
    if (dep === null || dep < 0 || dep > 100) throw new FlowError("نسبة العربون بين 0 و 100.");
    if (com === null || com < 0 || com > 90) throw new FlowError("نسبة العمولة بين 0 و 90.");
    if (wait === null || wait > 60) throw new FlowError("أيام الانتظار بين 0 و 60.");
    const data = {
      depositPercent: dep, commissionPercent: com, viewsWaitDays: wait,
      bankName: str(fd, "bankName", 80), bankAccountName: str(fd, "bankAccountName", 120), bankIban: str(fd, "bankIban", 40).replace(/\s/g, "").toUpperCase(),
    };
    await db.setting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  }, "انحفظت الإعدادات. تنطبق على الحملات الجديدة فقط.");
}
