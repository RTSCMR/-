// ينشئ حساب المشرف والإعدادات. مع --demo يضيف بيانات تجريبية تغطي كل مراحل الدورة.
//   npm run db:seed   → المشرف فقط
//   npm run db:demo   → المشرف + بيانات تجريبية
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeEarning, creatorCap, depositAmount } from "../src/lib/money";

try { process.loadEnvFile(); } catch {}

const db = new PrismaClient();
const DAY = 864e5;
const ago = (d: number) => new Date(Date.now() - d * DAY);

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@alf.sa").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "change-me-please";
  const production = process.env.NODE_ENV === "production";
  await db.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    // في الإنتاج ما ننشئ مشرف بكلمة مرور ضعيفة أو افتراضية
    if (production && (password === "change-me-please" || password.length < 12)) {
      console.error("✗ ADMIN_PASSWORD لازم يكون 12 حرف على الأقل ومو القيمة الافتراضية. ما انشأ حساب المشرف.");
      process.exitCode = 1;
      return;
    }
    await db.user.create({ data: { email, name: "المشرف", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`✓ انشأ المشرف: ${email}`);
  } else {
    console.log(`✓ المشرف موجود: ${email}`);
  }
  const admin = await db.user.findUniqueOrThrow({ where: { email } });

  if (!process.argv.includes("--demo")) return;
  if (production) {
    console.error("✗ البيانات التجريبية ممنوعة في الإنتاج.");
    return;
  }
  if (await db.user.findUnique({ where: { email: "merchant@demo.alf" } })) {
    console.log("البيانات التجريبية موجودة من قبل.");
    return;
  }

  // حساب بنكي وهمي للتجربة فقط، لو المشرف ما أضاف حسابه
  await db.setting.updateMany({ where: { id: 1, bankIban: "" }, data: { bankName: "بنك تجريبي", bankAccountName: "مؤسسة ألف (تجريبي)", bankIban: "SA0000000000000000000000" } });
  const pw = await bcrypt.hash("demo12345", 12);
  const merchant = await db.user.create({ data: { email: "merchant@demo.alf", name: "نورة", role: "MERCHANT", passwordHash: pw, storeName: "متجر عود الدار", storeUrl: "https://example.com/oud" } });
  const mk = (email: string, name: string, city: string, niche: string) =>
    db.user.create({
      data: {
        email, name, role: "CREATOR", passwordHash: pw, city, niche, bio: "حساب تجريبي.",
        tiktok: "https://www.tiktok.com/@example", portfolio: "https://www.tiktok.com/@example/video/1", iban: "SA0000000000000000000001",
      },
    });
  const [c1, c2, c3] = await Promise.all([
    mk("creator@demo.alf", "سارة", "الرياض", "عطور وعناية"),
    mk("creator2@demo.alf", "فهد", "جدة", "مراجعات منتجات"),
    mk("creator3@demo.alf", "ريم", "الدمام", "لايف ستايل"),
  ]);

  const s = await db.setting.findUniqueOrThrow({ where: { id: 1 } });
  const base = { merchantId: merchant.id, storeUrl: "https://example.com/oud", depositPercent: s.depositPercent, commissionPercent: s.commissionPercent };

  // 1) حملة مفتوحة فيها مشاركات في مراحل مختلفة
  const budget = 300000, cpm = 1500;
  const a = await db.campaign.create({
    data: {
      ...base, productName: "عطر عود 50 مل", platform: "TIKTOK", saudiOnly: true,
      brief: "فيديو 30 إلى 45 ثانية تجرب فيه العطر وتوصف ريحته بكلامك.\nاذكر إن الشحن مجاني داخل السعودية.\nبدون مقارنة مع ماركات ثانية.",
      cpmHalalas: cpm, budgetHalalas: budget, durationDays: 14, maxCreators: 3, depositHalalas: depositAmount(budget, s.depositPercent),
      status: "OPEN", depositReference: "تجريبي-1001", openedAt: ago(10), endsAt: new Date(Date.now() + 4 * DAY), createdAt: ago(11),
    },
  });
  await db.event.createMany({
    data: [
      { campaignId: a.id, actorId: merchant.id, toStatus: "AWAITING_DEPOSIT", note: "أُنشئت الحملة", createdAt: ago(11) },
      { campaignId: a.id, actorId: merchant.id, fromStatus: "AWAITING_DEPOSIT", toStatus: "DEPOSIT_REPORTED", note: "مرجع التحويل: تجريبي-1001", createdAt: ago(10.5) },
      { campaignId: a.id, actorId: admin.id, fromStatus: "DEPOSIT_REPORTED", toStatus: "OPEN", note: "تأكد استلام العربون", createdAt: ago(10) },
    ],
  });
  await db.payment.create({ data: { kind: "DEPOSIT", campaignId: a.id, amountHalalas: a.depositHalalas, reference: "تجريبي-1001", createdAt: ago(10) } });

  const apply = { accountLinks: "https://www.tiktok.com/@example", workLinks: "https://www.tiktok.com/@example/video/1" };
  // سارة: نشرت قبل 8 أيام، تقدر تدخل المشاهدات الآن
  const p1 = await db.participation.create({
    data: { ...apply, campaignId: a.id, creatorId: c1.id, status: "PUBLISHED", pitch: "جمهوري يهتم بالعطور الشرقية، وأغلبه من الرياض.", draftUrl: "https://example.com/draft-1", postUrl: "https://www.tiktok.com/@example/video/2", publishedAt: ago(8), createdAt: ago(9.8) },
  });
  // فهد: اعتُمدت مشاهداته وينتظر التحويل
  const e = computeEarning(42000, cpm, creatorCap(budget, 3), s.commissionPercent);
  const p2 = await db.participation.create({
    data: {
      ...apply, campaignId: a.id, creatorId: c2.id, status: "VIEWS_APPROVED", pitch: "أسوي مراجعات صريحة والناس تثق فيها.", draftUrl: "https://example.com/draft-2",
      postUrl: "https://www.tiktok.com/@example/video/3", publishedAt: ago(9), reportedViews: 42000, approvedViews: 42000, viewsSubmittedAt: ago(1.5),
      grossHalalas: e.gross, commissionHalalas: e.commission, netHalalas: e.net, createdAt: ago(9.9),
    },
  });
  // ريم: طلب جديد ينتظر رد التاجر
  const p3 = await db.participation.create({ data: { ...apply, campaignId: a.id, creatorId: c3.id, status: "APPLIED", pitch: "أقدر أصوّر العطر ضمن روتين الصباح.", createdAt: ago(1) } });
  const ev = (pid: string, actorId: string, from: string | null, to: string, d: number, note?: string) => ({ campaignId: a.id, participationId: pid, actorId, fromStatus: from, toStatus: to, note, createdAt: ago(d) });
  await db.event.createMany({
    data: [
      ev(p1.id, c1.id, null, "APPLIED", 9.8), ev(p1.id, merchant.id, "APPLIED", "ACCEPTED", 9.5), ev(p1.id, c1.id, "ACCEPTED", "DRAFT_SUBMITTED", 9),
      ev(p1.id, merchant.id, "DRAFT_SUBMITTED", "DRAFT_APPROVED", 8.5), ev(p1.id, c1.id, "DRAFT_APPROVED", "PUBLISHED", 8),
      ev(p2.id, c2.id, null, "APPLIED", 9.9), ev(p2.id, merchant.id, "APPLIED", "ACCEPTED", 9.7), ev(p2.id, c2.id, "ACCEPTED", "DRAFT_SUBMITTED", 9.5),
      ev(p2.id, merchant.id, "DRAFT_SUBMITTED", "REVISION_REQUESTED", 9.4, "اذكر الشحن المجاني في البداية"), ev(p2.id, c2.id, "REVISION_REQUESTED", "DRAFT_SUBMITTED", 9.3),
      ev(p2.id, merchant.id, "DRAFT_SUBMITTED", "DRAFT_APPROVED", 9.1), ev(p2.id, c2.id, "DRAFT_APPROVED", "PUBLISHED", 9), ev(p2.id, c2.id, "PUBLISHED", "VIEWS_SUBMITTED", 1.5),
      ev(p2.id, admin.id, "VIEWS_SUBMITTED", "VIEWS_APPROVED", 1, "اعتُمدت 42,000 مشاهدة"),
      ev(p3.id, c3.id, null, "APPLIED", 1),
    ],
  });

  // 2) حملة جديدة بانتظار العربون
  const b = await db.campaign.create({
    data: {
      ...base, productName: "بخور مسائي", platform: "SNAPCHAT", saudiOnly: true, brief: "سنابة قصيرة تبيّن طريقة استخدام البخور في المجلس.",
      cpmHalalas: 1200, budgetHalalas: 120000, durationDays: 10, maxCreators: 2, depositHalalas: depositAmount(120000, s.depositPercent),
    },
  });
  await db.event.create({ data: { campaignId: b.id, actorId: merchant.id, toStatus: "AWAITING_DEPOSIT", note: "أُنشئت الحملة" } });

  console.log("✓ بيانات تجريبية (كلمة المرور للكل: demo12345)");
  console.log("  تاجر: merchant@demo.alf");
  console.log("  صنّاع: creator@demo.alf ، creator2@demo.alf ، creator3@demo.alf");
}

main().finally(() => db.$disconnect());
