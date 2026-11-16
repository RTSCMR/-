import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { C, CAMPAIGN_STATUS, P, SEAT_STATUSES } from "@/lib/status";
import { campaignTotals } from "@/lib/workflow";
import { cancelCampaignAction, closeCampaignAction, reportDepositAction } from "@/lib/actions";
import { Empty, ExtLink, Num, Row, Sar, Section, StatusBadge, Timeline } from "@/components/ui";
import { CampaignMoney, CampaignTerms, ParticipationPanel } from "@/components/campaign-bits";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "تفاصيل الحملة" };

export default async function MerchantCampaign({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("MERCHANT");
  const { id } = await params;
  const c = await db.campaign.findUnique({
    where: { id },
    include: {
      participations: { include: { creator: true }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: true, participation: { include: { creator: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!c || c.merchantId !== user.id) notFound();
  const t = campaignTotals(c, c.participations);
  const s = await getSettings();
  const seats = c.participations.filter((p) => SEAT_STATUSES.includes(p.status)).length;
  const needsMe = c.participations.filter((p) => p.status === P.APPLIED || p.status === P.DRAFT_SUBMITTED);
  const others = c.participations.filter((p) => !needsMe.includes(p));

  return (
    <>
      <Link href="/merchant" className="text-sm font-semibold text-mute">→ حملاتي</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[2rem] sm:text-4xl">{c.productName}</h1>
          <ExtLink href={c.storeUrl} />
        </div>
        <StatusBadge kind="campaign" status={c.status} />
      </div>
      {CAMPAIGN_STATUS[c.status]?.hint && <p className="-mt-3 mb-6 text-mute">{CAMPAIGN_STATUS[c.status].hint}</p>}

      {c.status === C.AWAITING_DEPOSIT && (
        <div className="card mb-8 border-flame p-5">
          <p className="eyebrow">الخطوة الجاية: حوّل العربون</p>
          <p className="mt-2"><Sar h={c.depositHalalas} className="text-6xl text-flame" /></p>
          <div className="mt-4">
            <Row label="البنك"><span className="font-semibold">{s.bankName || "—"}</span></Row>
            <Row label="اسم الحساب"><span className="font-semibold">{s.bankAccountName || "—"}</span></Row>
            <Row label="الآيبان"><span dir="ltr" className="break-all font-semibold">{s.bankIban || "—"}</span></Row>
          </div>
          {!s.bankIban && <p className="hint mt-2">بيانات الحساب البنكي ما انضافت للحين. تواصل مع المشرف.</p>}
          <ActionForm action={reportDepositAction} hidden={{ id: c.id }} className="mt-5 space-y-3">
            <div>
              <label className="label" htmlFor="reference">بعد التحويل: رقم الحوالة أو اسم المحوّل</label>
              <input className="field" id="reference" name="reference" required maxLength={120} />
            </div>
            <Submit variant="flame">حوّلت العربون</Submit>
          </ActionForm>
          <ActionForm action={cancelCampaignAction} hidden={{ id: c.id }} className="mt-4" confirm="تلغي الحملة؟">
            <button className="text-sm font-semibold text-mute underline">ألغِ الحملة</button>
          </ActionForm>
        </div>
      )}
      {c.status === C.DEPOSIT_REPORTED && (
        <div className="card mb-8 p-5">
          <p className="font-semibold">بلّغت بتحويل العربون (<Sar h={c.depositHalalas} />). مرجع التحويل: {c.depositReference}</p>
          <p className="hint mt-1">أول ما نأكد وصوله، تنتشر الحملة لصنّاع المحتوى.</p>
        </div>
      )}
      {c.status === C.COMPLETED && t.balance !== 0 && (
        <div className="card mb-8 border-flame p-5">
          <p className="eyebrow">{t.balance > 0 ? "الحساب النهائي: المتبقي عليك" : "الحساب النهائي: يرجع لك"}</p>
          <p className="mt-2"><Sar h={Math.abs(t.balance)} className="text-6xl text-flame" /></p>
          {t.balance > 0 ? (
            <div className="mt-4">
              <Row label="البنك"><span className="font-semibold">{s.bankName || "—"}</span></Row>
              <Row label="اسم الحساب"><span className="font-semibold">{s.bankAccountName || "—"}</span></Row>
              <Row label="الآيبان"><span dir="ltr" className="break-all font-semibold">{s.bankIban || "—"}</span></Row>
              <p className="hint mt-2">حوّل المبلغ على نفس الحساب، والمشرف يسجّل استلامه ويقفل الحملة.</p>
            </div>
          ) : (
            <p className="hint mt-2">المستحق طلع أقل من العربون. المشرف بيحوّل لك الفرق.</p>
          )}
        </div>
      )}

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Section title="الحساب"><CampaignMoney c={c} t={t} /></Section>
        <Section title="شروط الحملة"><CampaignTerms c={c} /></Section>
      </div>

      <Section title="وصف المطلوب"><p className="whitespace-pre-line break-words">{c.brief}</p></Section>

      <Section title="صنّاع المحتوى" aside={<span className="text-sm text-mute">المقبولين <Num n={seats} className="text-base text-ink" /> من <Num n={c.maxCreators} className="text-base text-ink" /></span>}>
        {c.participations.length === 0 ? (
          <Empty>{c.status === C.OPEN ? "ما قدّم أحد للحين. الحملة ظاهرة لصنّاع المحتوى." : "ما فيه متقدمين."}</Empty>
        ) : (
          <div className="space-y-4">
            {needsMe.length > 0 && <p className="bg-flame px-3 py-2 font-semibold text-white"><span className="num">{needsMe.length}</span> بانتظار ردّك</p>}
            {[...needsMe, ...others].map((p) => <ParticipationPanel key={p.id} p={p} c={c} viewer="merchant" />)}
          </div>
        )}
        {c.status === C.OPEN && (
          <ActionForm action={closeCampaignAction} hidden={{ id: c.id }} className="mt-5" confirm="تقفل التقديم؟ الطلبات اللي ما رديت عليها بتنرفض، وما تقدر تقبل أحد جديد.">
            <Submit variant="line" small>اقفل التقديم</Submit>
            <p className="hint mt-2">اقفله لما تكتفي بالمقبولين. الحساب النهائي يطلع بعد ما يخلصون شغلهم.</p>
          </ActionForm>
        )}
      </Section>

      <Section title="السجل الزمني"><Timeline events={c.events} showCreator /></Section>
    </>
  );
}
