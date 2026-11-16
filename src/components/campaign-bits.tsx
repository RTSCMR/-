import Link from "next/link";
import type { Campaign, Participation, User } from "@prisma/client";
import { PLATFORMS, CAMPAIGN_STATUS, C, P, EARNED_STATUSES } from "@/lib/status";
import { creatorCap, effectiveCpm, expectedViews } from "@/lib/money";
import type { Totals } from "@/lib/workflow";
import {
  cancelParticipationAction, decideApplicationAction, recordPayoutAction, reviewDraftAction, reviewViewsAction,
} from "@/lib/actions";
import { ExtLink, Gauge, LinkLines, Num, Row, Sar, StatusBadge, formatDate } from "./ui";
import { ActionForm, Submit } from "./forms";

/** شروط الحملة كفاتورة */
export function CampaignTerms({ c }: { c: Campaign }) {
  return (
    <div>
      <Row label="المنصة"><span className="font-semibold">{PLATFORMS[c.platform]}</span></Row>
      <Row label="سعر الألف مشاهدة"><Sar h={c.cpmHalalas} /></Row>
      <Row label="سقف الميزانية"><Sar h={c.budgetHalalas} /></Row>
      <Row label="المشاهدات المتوقعة"><Num n={expectedViews(c.budgetHalalas, c.cpmHalalas)} /></Row>
      <Row label="عدد صنّاع المحتوى"><Num n={c.maxCreators} /></Row>
      <Row label="حصة كل صانع من السقف"><Sar h={creatorCap(c.budgetHalalas, c.maxCreators)} /></Row>
      <Row label={`العربون (${c.depositPercent}%)`}><Sar h={c.depositHalalas} /></Row>
      <Row label="مدة الحملة">
        <span className="font-semibold">
          <Num n={c.durationDays} /> يوم{c.endsAt ? ` · التقديم لين ${formatDate(c.endsAt)}` : ""}
        </span>
      </Row>
      <Row label="الجمهور"><span className="font-semibold">{c.saudiOnly ? "سعودي (شرط)" : "بدون شرط"}</span></Row>
    </div>
  );
}

/** الحساب المالي للحملة: المصروف، العربون، المتبقي */
export function CampaignMoney({ c, t, showCommission = false }: { c: Campaign; t: Totals; showCommission?: boolean }) {
  const ecpm = effectiveCpm(t.gross, t.approvedViews);
  const depositPaid = ![C.AWAITING_DEPOSIT, C.DEPOSIT_REPORTED, C.CANCELLED].includes(c.status as never);
  const final = c.status === C.COMPLETED || c.status === C.SETTLED;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="eyebrow">المصروف مقابل السقف</span>
        <span className="text-sm text-mute"><Sar h={t.gross} unit={false} className="text-base text-ink" /> من <Sar h={c.budgetHalalas} className="text-base text-ink" /></span>
      </div>
      <Gauge value={t.gross} max={c.budgetHalalas} />
      <div className="mt-3">
        <Row label="المشاهدات المعتمدة"><Num n={t.approvedViews} /></Row>
        <Row label="تكلفة الألف الفعلية">{ecpm === null ? <span className="text-mute">—</span> : <Sar h={ecpm} />}</Row>
        <Row label="المستحق على المشاهدات"><Sar h={t.gross} /></Row>
        {showCommission && <Row label={`عمولة المنصة (${c.commissionPercent}%)`}><Sar h={t.commission} /></Row>}
        {showCommission && <Row label="صافي مستحقات الصنّاع"><Sar h={t.net} /></Row>}
        <Row label={depositPaid ? "العربون المدفوع" : "العربون (ما تأكد للحين)"}><Sar h={depositPaid ? -c.depositHalalas : 0} /></Row>
        <Row total label={c.status === C.SETTLED ? (t.balance >= 0 ? "المتبقي (تسدّد)" : "المسترد (ترجّع)") : t.balance >= 0 ? (final ? "المتبقي عليك" : "المتبقي عليك للحين") : final ? "يرجع لك" : "رصيد العربون الباقي"}>
          <Sar h={Math.abs(t.balance)} className={final && c.status !== C.SETTLED && t.balance > 0 ? "text-flame" : ""} />
        </Row>
      </div>
      {!final && c.status !== C.CANCELLED && <p className="hint mt-2">الأرقام تتحدث مع كل اعتماد. الحساب النهائي يطلع بعد ما تكتمل كل المشاركات.</p>}
    </div>
  );
}

export function CampaignCard({ c, t, href, extra }: { c: Campaign; t: Totals; href: string; extra?: React.ReactNode }) {
  return (
    <Link href={href} className="card block p-4 no-underline hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl">{c.productName}</h3>
          <p className="hint">{PLATFORMS[c.platform]} · <Sar h={c.cpmHalalas} className="text-sm text-ink" /> للألف</p>
        </div>
        <StatusBadge kind="campaign" status={c.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="eyebrow">مشاهدات معتمدة</p>
          <Num n={t.approvedViews} className="mt-1 text-3xl" />
        </div>
        <div>
          <p className="eyebrow">المصروف من <Sar h={c.budgetHalalas} unit={false} className="text-xs" /></p>
          <Sar h={t.gross} className="mt-1 text-3xl" />
        </div>
      </div>
      <div className="mt-3"><Gauge value={t.gross} max={c.budgetHalalas} /></div>
      {extra}
      {CAMPAIGN_STATUS[c.status]?.hint && <p className="hint mt-2">{CAMPAIGN_STATUS[c.status].hint}</p>}
    </Link>
  );
}

type PWithCreator = Participation & { creator: User };

/** بطاقة مشاركة واحدة، مع الإجراءات المتاحة للتاجر أو المشرف حسب الحالة. */
export function ParticipationPanel({ p, c, viewer }: { p: PWithCreator; c: Campaign; viewer: "merchant" | "admin" }) {
  const admin = viewer === "admin";
  const earned = EARNED_STATUSES.includes(p.status);
  const cap = creatorCap(c.budgetHalalas, c.maxCreators);
  const cancellable = admin && ([P.ACCEPTED, P.DRAFT_SUBMITTED, P.REVISION_REQUESTED, P.DRAFT_APPROVED, P.PUBLISHED, P.VIEWS_SUBMITTED, P.VIEWS_REJECTED] as string[]).includes(p.status);
  return (
    <article className="card p-4" id={`p-${p.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/creators/${p.creatorId}`} className="text-xl font-semibold underline decoration-flame decoration-2">{p.creator.name}</Link>
          <p className="hint">{[p.creator.city, p.creator.niche].filter(Boolean).join(" · ") || "ما كمّل ملفه"}</p>
        </div>
        <StatusBadge kind="participation" status={p.status} />
      </header>

      <dl className="mt-3 space-y-3 text-[0.95rem]">
        <div><dt className="eyebrow">ليش هو مناسب</dt><dd className="whitespace-pre-line break-words">{p.pitch}</dd></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><dt className="eyebrow">حساباته</dt><dd><LinkLines text={p.accountLinks} /></dd></div>
          <div><dt className="eyebrow">أعماله</dt><dd><LinkLines text={p.workLinks} /></dd></div>
        </div>
        {p.draftUrl && <div><dt className="eyebrow">المسودة</dt><dd><ExtLink href={p.draftUrl} />{p.draftNote && <p className="mt-1">{p.draftNote}</p>}</dd></div>}
        {p.revisionNote && p.status === P.REVISION_REQUESTED && <div><dt className="eyebrow">التعديل المطلوب</dt><dd>{p.revisionNote}</dd></div>}
        {p.postUrl && <div><dt className="eyebrow">المنشور · {formatDate(p.publishedAt)}</dt><dd><ExtLink href={p.postUrl} /></dd></div>}
        {p.reportedViews !== null && (
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
            <div><dt className="eyebrow">المشاهدات المدخلة</dt><dd><Num n={p.reportedViews} className="text-3xl" /></dd></div>
            {p.approvedViews !== null && earned && <div><dt className="eyebrow">المعتمدة</dt><dd><Num n={p.approvedViews} className="text-3xl text-flame" /></dd></div>}
            {p.screenshotFile && <a href={`/api/uploads/${p.screenshotFile}`} target="_blank" className="btn btn-line btn-sm">لقطة الإحصائيات</a>}
          </div>
        )}
        {p.reviewNote && <div><dt className="eyebrow">ملاحظة المشرف</dt><dd>{p.reviewNote}</dd></div>}
      </dl>

      {earned && (
        <div className="mt-3 border-t-[1.5px] border-ink pt-2">
          <Row label="المستحق على المشاهدات"><Sar h={p.grossHalalas ?? 0} /></Row>
          {admin && <Row label={`العمولة (${c.commissionPercent}%)`}><Sar h={p.commissionHalalas ?? 0} /></Row>}
          {admin && <Row total label={p.status === P.PAID ? `تحوّل له · ${formatDate(p.paidAt)}` : "صافي يتحول له"}><Sar h={p.netHalalas ?? 0} /></Row>}
          {(p.grossHalalas ?? 0) >= cap && <p className="hint">وصل سقف حصته (<Sar h={cap} className="text-sm" />).</p>}
        </div>
      )}

      {/* إجراءات التاجر */}
      {viewer === "merchant" && p.status === P.APPLIED && (
        <ActionForm action={decideApplicationAction} hidden={{ id: p.id }} className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            <Submit variant="flame" name="decision" value="accept">اقبل</Submit>
            <Submit variant="line" name="decision" value="reject" confirm={`ترفض طلب ${p.creator.name}؟`}>ارفض</Submit>
          </div>
        </ActionForm>
      )}
      {viewer === "merchant" && p.status === P.DRAFT_SUBMITTED && (
        <ActionForm action={reviewDraftAction} hidden={{ id: p.id }} className="mt-4 space-y-2">
          <label className="label" htmlFor={`note-${p.id}`}>لو تبي تعديل، اكتبه هنا</label>
          <textarea className="field" id={`note-${p.id}`} name="note" maxLength={1000} placeholder="مثال: اذكر السعر في أول 5 ثواني" />
          <div className="grid grid-cols-2 gap-2">
            <Submit variant="flame" name="decision" value="approve">وافق على المسودة</Submit>
            <Submit variant="line" name="decision" value="revise">اطلب تعديل</Submit>
          </div>
        </ActionForm>
      )}

      {/* إجراءات المشرف */}
      {admin && p.status === P.VIEWS_SUBMITTED && (
        <ActionForm action={reviewViewsAction} hidden={{ id: p.id }} className="mt-4 space-y-3 border-t-[1.5px] border-ink pt-4">
          <p className="font-semibold">مراجعة المشاهدات{c.saudiOnly ? " — تأكد إن الجمهور سعودي" : ""}</p>
          <div>
            <label className="label" htmlFor={`av-${p.id}`}>المشاهدات المعتمدة</label>
            <input className="field num !text-2xl" id={`av-${p.id}`} name="approvedViews" inputMode="numeric" defaultValue={p.reportedViews ?? 0} />
          </div>
          <div>
            <label className="label" htmlFor={`rn-${p.id}`}>ملاحظة (مطلوبة عند الرفض)</label>
            <input className="field" id={`rn-${p.id}`} name="note" maxLength={600} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Submit variant="flame" name="decision" value="approve">اعتمد</Submit>
            <Submit variant="line" name="decision" value="reject">ارفض</Submit>
          </div>
        </ActionForm>
      )}
      {admin && p.status === P.VIEWS_APPROVED && (
        <ActionForm action={recordPayoutAction} hidden={{ id: p.id }} className="mt-4 space-y-3 border-t-[1.5px] border-ink pt-4">
          <p className="font-semibold">سجّل التحويل لصانع المحتوى</p>
          <p className="hint">الآيبان: <span dir="ltr" className="font-semibold text-ink">{p.creator.iban || "ما أضافه"}</span></p>
          <div>
            <label className="label" htmlFor={`ref-${p.id}`}>رقم الحوالة</label>
            <input className="field" id={`ref-${p.id}`} name="reference" dir="ltr" required maxLength={120} />
          </div>
          <Submit>تم تحويل <Sar h={p.netHalalas ?? 0} unit={false} className="text-xl" /> ر.س</Submit>
        </ActionForm>
      )}
      {cancellable && (
        <details className="mt-4 border-t border-line pt-3">
          <summary className="text-sm font-semibold text-mute underline">إلغاء المشاركة</summary>
          <ActionForm action={cancelParticipationAction} hidden={{ id: p.id }} className="mt-3 space-y-2" confirm="تلغي المشاركة؟ ما ينحسب لها شي.">
            <input className="field" name="note" required maxLength={300} placeholder="السبب" aria-label="سبب الإلغاء" />
            <Submit variant="line" small>ألغِ المشاركة</Submit>
          </ActionForm>
        </details>
      )}
    </article>
  );
}
