import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { C, CAMPAIGN_STATUS, P, PAYMENT_KIND } from "@/lib/status";
import { campaignTotals } from "@/lib/workflow";
import { cancelCampaignAction, closeCampaignAction, confirmDepositAction, settleCampaignAction } from "@/lib/actions";
import { Empty, ExtLink, Row, Sar, Section, StatusBadge, Timeline, formatDate } from "@/components/ui";
import { CampaignMoney, CampaignTerms, ParticipationPanel } from "@/components/campaign-bits";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "حملة (مشرف)" };

export default async function AdminCampaign({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const c = await db.campaign.findUnique({
    where: { id },
    include: {
      merchant: true,
      participations: { include: { creator: true }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: true, participation: { include: { creator: true } } }, orderBy: { createdAt: "desc" } },
      payments: { include: { participation: { include: { creator: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) notFound();
  const t = campaignTotals(c, c.participations);
  const awaiting = c.status === C.AWAITING_DEPOSIT || c.status === C.DEPOSIT_REPORTED;
  const unpaid = c.participations.filter((p) => p.status === P.VIEWS_APPROVED).length;
  const order = (s: string) => (s === P.VIEWS_SUBMITTED ? 0 : s === P.VIEWS_APPROVED ? 1 : 2);
  const parts = [...c.participations].sort((a, b) => order(a.status) - order(b.status));

  return (
    <>
      <Link href="/admin/campaigns" className="text-sm font-semibold text-mute">→ كل الحملات</Link>
      <div className="mb-2 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[2rem] sm:text-4xl">{c.productName}</h1>
          <ExtLink href={c.storeUrl} />
        </div>
        <StatusBadge kind="campaign" status={c.status} />
      </div>
      <p className="mb-6 text-mute">
        التاجر: <span className="font-semibold text-ink">{c.merchant.storeName || c.merchant.name}</span> · <span dir="ltr">{c.merchant.email}</span>
        {c.merchant.phone ? <> · <span dir="ltr">{c.merchant.phone}</span></> : null} · أُنشئت {formatDate(c.createdAt)}
      </p>

      {awaiting && (
        <div className="card mb-8 border-flame p-5">
          <p className="eyebrow">{CAMPAIGN_STATUS[c.status].hint}</p>
          <p className="mt-2"><Sar h={c.depositHalalas} className="text-6xl text-flame" /></p>
          <ActionForm action={confirmDepositAction} hidden={{ id: c.id }} className="mt-4 space-y-3" confirm="تأكد إن المبلغ وصل الحساب البنكي فعلاً. بعد التأكيد تنتشر الحملة لصنّاع المحتوى.">
            <div>
              <label className="label" htmlFor="reference">مرجع التحويل</label>
              <input className="field" id="reference" name="reference" defaultValue={c.depositReference ?? ""} maxLength={120} />
            </div>
            <Submit variant="flame">استلمت العربون، انشر الحملة</Submit>
          </ActionForm>
          <ActionForm action={cancelCampaignAction} hidden={{ id: c.id }} className="mt-4" confirm="تلغي الحملة؟">
            <button className="text-sm font-semibold text-mute underline">ألغِ الحملة</button>
          </ActionForm>
        </div>
      )}

      {c.status === C.COMPLETED && (
        <div className="card mb-8 border-flame p-5">
          <p className="eyebrow">{t.balance > 0 ? "التسوية: المتبقي على التاجر" : t.balance < 0 ? "التسوية: مسترد للتاجر" : "التسوية: العربون غطّى المستحق"}</p>
          <p className="mt-2"><Sar h={Math.abs(t.balance)} className="text-6xl text-flame" /></p>
          {unpaid > 0 && <p className="hint mt-2">تنبيه: فيه <span className="num text-ink">{unpaid}</span> من الصنّاع ما تحوّل لهم للحين. تقدر تسوّي مع التاجر أول.</p>}
          <ActionForm action={settleCampaignAction} hidden={{ id: c.id }} className="mt-4 space-y-3" confirm="تسجّل التسوية؟ بعدها تنقفل الحملة نهائياً.">
            {t.balance !== 0 && (
              <div>
                <label className="label" htmlFor="sref">{t.balance > 0 ? "رقم حوالة التاجر" : "رقم حوالة الاسترداد"}</label>
                <input className="field" id="sref" name="reference" dir="ltr" required maxLength={120} />
              </div>
            )}
            <Submit variant="flame">{t.balance > 0 ? "استلمت المتبقي، اقفل الحملة" : t.balance < 0 ? "حوّلت المسترد، اقفل الحملة" : "اقفل الحملة"}</Submit>
          </ActionForm>
        </div>
      )}

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Section title="الحساب"><CampaignMoney c={c} t={t} showCommission /></Section>
        <Section title="شروط الحملة"><CampaignTerms c={c} /></Section>
      </div>
      <Section title="وصف المطلوب"><p className="whitespace-pre-line break-words">{c.brief}</p></Section>

      <Section title="المشاركات">
        {parts.length === 0 ? <Empty>ما فيه متقدمين.</Empty> : <div className="space-y-4">{parts.map((p) => <ParticipationPanel key={p.id} p={p} c={c} viewer="admin" />)}</div>}
        {c.status === C.OPEN && (
          <ActionForm action={closeCampaignAction} hidden={{ id: c.id }} className="mt-5" confirm="تقفل التقديم؟ الطلبات المعلّقة بتنرفض.">
            <Submit variant="line" small>اقفل التقديم</Submit>
          </ActionForm>
        )}
      </Section>

      <Section title="التحويلات المسجلة">
        {c.payments.length === 0 ? <Empty>ما تسجّل أي تحويل.</Empty> : (
          <div>
            {c.payments.map((p) => (
              <Row key={p.id} label={<span><span className="font-semibold">{PAYMENT_KIND[p.kind]}</span>{p.participation ? ` · ${p.participation.creator.name}` : ""}<span className="hint block">{formatDate(p.createdAt, true)}{p.reference ? ` · ${p.reference}` : ""}</span></span>}>
                <Sar h={p.amountHalalas} />
              </Row>
            ))}
          </div>
        )}
      </Section>

      <Section title="السجل الزمني"><Timeline events={c.events} showCreator /></Section>
    </>
  );
}
