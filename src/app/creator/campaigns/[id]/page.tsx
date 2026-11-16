import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { C, PLATFORMS, SEAT_STATUSES } from "@/lib/status";
import { creatorCap } from "@/lib/money";
import { applyAction } from "@/lib/actions";
import { ExtLink, Num, Row, Sar, Section, formatDate } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "حملة" };

export default async function CampaignForCreator({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CREATOR");
  const { id } = await params;
  const c = await db.campaign.findUnique({ where: { id }, include: { merchant: true, participations: { select: { id: true, creatorId: true, status: true } } } });
  // الحملة ما تظهر للصانع إلا بعد تأكيد العربون
  if (!c || ([C.AWAITING_DEPOSIT, C.DEPOSIT_REPORTED, C.CANCELLED] as string[]).includes(c.status)) notFound();
  const mine = c.participations.find((p) => p.creatorId === user.id);
  const open = c.status === C.OPEN && (!c.endsAt || c.endsAt > new Date());
  const seats = c.participations.filter((p) => SEAT_STATUSES.includes(p.status)).length;
  const cap = creatorCap(c.budgetHalalas, c.maxCreators);
  const accounts = [user.tiktok, user.instagram, user.snapchat].filter(Boolean).join("\n");

  return (
    <>
      <Link href="/creator/campaigns" className="text-sm font-semibold text-mute">→ الحملات</Link>
      <h1 className="mt-2 text-[2rem] sm:text-4xl">{c.productName}</h1>
      <p className="text-mute">{c.merchant.storeName || c.merchant.name} · <ExtLink href={c.storeUrl} /></p>

      <div className="mt-6 grid gap-x-10 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div>
          <div className="border-y-[1.5px] border-ink py-5">
            <p className="eyebrow">لكل ألف مشاهدة معتمدة</p>
            <Sar h={c.cpmHalalas} className="mt-2 text-7xl text-flame" />
            <div className="ticks mt-4" />
            <div className="mt-2">
              <Row label="المنصة"><span className="font-semibold">{PLATFORMS[c.platform]}</span></Row>
              <Row label="أقصى مستحق لك (حصتك من السقف)"><Sar h={cap} /></Row>
              <Row label={`عمولة المنصة`}><span className="num text-lg">{c.commissionPercent}%</span></Row>
              <Row label="المقاعد"><span><Num n={seats} /> من <Num n={c.maxCreators} /></span></Row>
              <Row label="التقديم لين"><span className="font-semibold">{formatDate(c.endsAt)}</span></Row>
              <Row label="الجمهور"><span className="font-semibold">{c.saudiOnly ? "لازم يكون سعودي" : "بدون شرط"}</span></Row>
            </div>
          </div>
          <Section title="وصف المطلوب"><p className="whitespace-pre-line break-words">{c.brief}</p></Section>
        </div>

        <aside className="card mt-8 p-5 lg:sticky lg:top-24 lg:mt-0">
          {mine ? (
            <>
              <p className="font-semibold">قدّمت على هذي الحملة.</p>
              <Link href={`/creator/participations/${mine.id}`} className="btn mt-4 w-full">تابع مشاركتك</Link>
            </>
          ) : !open ? (
            <p className="font-semibold">التقديم على هذي الحملة مقفل.</p>
          ) : (
            <ActionForm action={applyAction} hidden={{ campaignId: c.id }} className="space-y-4">
              <h2 className="text-2xl">قدّم على الحملة</h2>
              <div>
                <label className="label" htmlFor="pitch">ليش أنت مناسب؟</label>
                <textarea className="field" id="pitch" name="pitch" required maxLength={1000} placeholder="فكرة الفيديو باختصار، وليش جمهورك يهمه المنتج." />
              </div>
              <div>
                <label className="label" htmlFor="accountLinks">روابط حساباتك</label>
                <textarea className="field" id="accountLinks" name="accountLinks" dir="ltr" required maxLength={800} defaultValue={accounts} placeholder="https://" />
                <p className="hint mt-1">رابط في كل سطر.</p>
              </div>
              <div>
                <label className="label" htmlFor="workLinks">روابط أعمال سابقة</label>
                <textarea className="field" id="workLinks" name="workLinks" dir="ltr" required maxLength={800} defaultValue={user.portfolio ?? ""} placeholder="https://" />
              </div>
              <Submit variant="flame" className="w-full">أرسل الطلب</Submit>
            </ActionForm>
          )}
        </aside>
      </div>
    </>
  );
}
