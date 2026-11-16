import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { P, PLATFORMS } from "@/lib/status";
import { creatorCap } from "@/lib/money";
import { submitDraftAction, submitPostAction, submitViewsAction } from "@/lib/actions";
import { ExtLink, Num, Row, Sar, Section, StatusBadge, Timeline, formatDate } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "مشاركتي" };

export default async function MyParticipation({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CREATOR");
  const { id } = await params;
  const p = await db.participation.findUnique({
    where: { id },
    include: { campaign: { include: { merchant: true } }, events: { include: { actor: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!p || p.creatorId !== user.id) notFound();
  const c = p.campaign;
  const s = await getSettings();
  const cap = creatorCap(c.budgetHalalas, c.maxCreators);
  const due = p.publishedAt ? new Date(p.publishedAt.getTime() + s.viewsWaitDays * 864e5) : null;
  const canReport = (p.status === P.PUBLISHED || p.status === P.VIEWS_REJECTED) && due !== null && due <= new Date();
  const earned = p.status === P.VIEWS_APPROVED || p.status === P.PAID;

  return (
    <>
      <Link href="/creator" className="text-sm font-semibold text-mute">→ مشاركاتي</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[2rem] sm:text-4xl">{c.productName}</h1>
          <p className="text-mute">{c.merchant.storeName || c.merchant.name} · {PLATFORMS[c.platform]} · <Sar h={c.cpmHalalas} className="text-base text-ink" /> للألف</p>
        </div>
        <StatusBadge kind="participation" status={p.status} />
      </div>

      {/* الخطوة الحالية */}
      <div className="card p-5">
        {p.status === P.APPLIED && <p className="font-semibold">طلبك عند التاجر. بنعلّمك هنا لما يرد.</p>}
        {p.status === P.REJECTED && <p className="font-semibold">التاجر ما قبل الطلب هالمرة. فيه حملات ثانية مفتوحة.</p>}
        {p.status === P.CANCELLED && <p className="font-semibold">انلغت هذي المشاركة.</p>}

        {(p.status === P.ACCEPTED || p.status === P.REVISION_REQUESTED) && (
          <ActionForm action={submitDraftAction} hidden={{ id: p.id }} className="space-y-4">
            <h2 className="text-2xl">{p.status === P.ACCEPTED ? "انقبلت. ارفع مسودة الفيديو" : "التاجر طلب تعديل"}</h2>
            {p.status === P.REVISION_REQUESTED && p.revisionNote && <p className="border-s-4 border-flame bg-flame-tint px-3 py-2">{p.revisionNote}</p>}
            <div>
              <label className="label" htmlFor="draftUrl">رابط المسودة</label>
              <input className="field" id="draftUrl" name="draftUrl" type="url" dir="ltr" required placeholder="https://" defaultValue={p.status === P.REVISION_REQUESTED ? "" : p.draftUrl ?? ""} />
              <p className="hint mt-1">ارفع الفيديو على قوقل درايف أو أي خدمة مشاركة، وتأكد إن الرابط يفتح بدون تسجيل. لا تنشر قبل موافقة التاجر.</p>
            </div>
            <div>
              <label className="label" htmlFor="draftNote">ملاحظة للتاجر (اختياري)</label>
              <textarea className="field" id="draftNote" name="draftNote" maxLength={600} />
            </div>
            <Submit variant="flame">أرسل المسودة</Submit>
          </ActionForm>
        )}

        {p.status === P.DRAFT_SUBMITTED && <p className="font-semibold">المسودة عند التاجر. ينتظر منه موافقة أو طلب تعديل.</p>}

        {p.status === P.DRAFT_APPROVED && (
          <ActionForm action={submitPostAction} hidden={{ id: p.id }} className="space-y-4">
            <h2 className="text-2xl">التاجر وافق. انشر الفيديو</h2>
            <div>
              <label className="label" htmlFor="postUrl">رابط المنشور على {PLATFORMS[c.platform]}</label>
              <input className="field" id="postUrl" name="postUrl" type="url" dir="ltr" required placeholder="https://" />
              <p className="hint mt-1">العدّ يبدأ من لحظة تسجيل الرابط. بعد {s.viewsWaitDays} أيام تدخل عدد المشاهدات.</p>
            </div>
            <Submit variant="flame">سجّل النشر</Submit>
          </ActionForm>
        )}

        {(p.status === P.PUBLISHED || p.status === P.VIEWS_REJECTED) && !canReport && (
          <>
            <h2 className="text-2xl">الفيديو منشور. خلّه يجمع مشاهدات</h2>
            <p className="mt-2">إدخال المشاهدات يفتح يوم <span className="font-bold">{formatDate(due, true)}</span>.</p>
          </>
        )}
        {canReport && (
          <ActionForm action={submitViewsAction} hidden={{ id: p.id }} className="space-y-4">
            <h2 className="text-2xl">{p.status === P.VIEWS_REJECTED ? "الأرقام انرفضت. أعد رفعها" : "ادخل عدد المشاهدات"}</h2>
            {p.status === P.VIEWS_REJECTED && p.reviewNote && <p className="border-s-4 border-flame bg-flame-tint px-3 py-2">{p.reviewNote}</p>}
            <div>
              <label className="label" htmlFor="views">عدد المشاهدات</label>
              <input className="field num !text-3xl" id="views" name="views" inputMode="numeric" required placeholder="0" />
            </div>
            <div>
              <label className="label" htmlFor="screenshot">لقطة شاشة من إحصائيات الفيديو</label>
              <input className="field" id="screenshot" name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" required />
              <p className="hint mt-1">لازم يبان فيها عدد المشاهدات{c.saudiOnly ? " وتوزيع الجمهور حسب الدولة" : ""}. PNG أو JPG، أقصى حجم 5 ميجا.</p>
            </div>
            <Submit variant="flame">أرسل للمراجعة</Submit>
          </ActionForm>
        )}

        {p.status === P.VIEWS_SUBMITTED && (
          <>
            <p className="font-semibold">الأرقام عند المشرف للمراجعة.</p>
            <p className="mt-2"><span className="eyebrow">المشاهدات المدخلة </span><Num n={p.reportedViews ?? 0} className="text-4xl" /></p>
          </>
        )}

        {earned && (
          <>
            <p className="eyebrow">{p.status === P.PAID ? `تحوّل لحسابك · ${formatDate(p.paidAt)}` : "صافي مستحقك، بانتظار التحويل"}</p>
            <p className="mt-2"><Sar h={p.netHalalas ?? 0} className="text-7xl text-flame" /></p>
            <div className="ticks mt-4" />
            <div className="mt-2">
              <Row label="المشاهدات المعتمدة"><Num n={p.approvedViews ?? 0} /></Row>
              <Row label="المستحق على المشاهدات"><Sar h={p.grossHalalas ?? 0} /></Row>
              <Row label={`عمولة المنصة (${c.commissionPercent}%)`}><Sar h={-(p.commissionHalalas ?? 0)} /></Row>
              <Row total label="الصافي"><Sar h={p.netHalalas ?? 0} /></Row>
            </div>
            {(p.grossHalalas ?? 0) >= cap && <p className="hint mt-2">وصلت سقف حصتك من ميزانية الحملة.</p>}
            {p.status === P.VIEWS_APPROVED && !user.iban && <p className="mt-3 border-s-4 border-flame bg-flame-tint px-3 py-2">أضف الآيبان في <Link href="/creator/profile" className="font-semibold underline">ملفك</Link> عشان نحوّل لك.</p>}
          </>
        )}
      </div>

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Section title="المطلوب">
          <p className="whitespace-pre-line break-words">{c.brief}</p>
          <div className="mt-4">
            <Row label="رابط المتجر"><ExtLink href={c.storeUrl} /></Row>
            <Row label="أقصى مستحق لك"><Sar h={cap} /></Row>
            <Row label="الجمهور"><span className="font-semibold">{c.saudiOnly ? "لازم يكون سعودي" : "بدون شرط"}</span></Row>
            {p.draftUrl && <Row label="المسودة"><ExtLink href={p.draftUrl} /></Row>}
            {p.postUrl && <Row label="المنشور"><ExtLink href={p.postUrl} /></Row>}
          </div>
        </Section>
        <Section title="السجل الزمني"><Timeline events={p.events} /></Section>
      </div>
    </>
  );
}
