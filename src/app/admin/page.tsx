import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { C, P } from "@/lib/status";
import { getSettings } from "@/lib/settings";
import { campaignTotals } from "@/lib/workflow";
import { Empty, Num, PageTitle, Sar, Section, Stat, StatusBadge } from "@/components/ui";

export const metadata = { title: "لوحة المشرف" };

function Queue({ title, items, empty }: { title: string; items: { href: string; main: string; sub: string; amount?: React.ReactNode }[]; empty: string }) {
  return (
    <Section title={title} aside={<Num n={items.length} className={`text-2xl ${items.length ? "text-flame" : "text-mute"}`} />}>
      {items.length === 0 ? <Empty>{empty}</Empty> : (
        <ul className="border-[1.5px] border-ink bg-card">
          {items.map((it, i) => (
            <li key={it.href + i} className={i ? "border-t border-line" : ""}>
              <Link href={it.href} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-white">
                <span className="min-w-0"><span className="block truncate font-semibold">{it.main}</span><span className="hint block truncate">{it.sub}</span></span>
                {it.amount}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export default async function AdminHome() {
  await requireRole("ADMIN");
  const [merchants, creators, campaigns, payments, queueParts] = await Promise.all([
    db.user.count({ where: { role: "MERCHANT" } }),
    db.user.count({ where: { role: "CREATOR" } }),
    db.campaign.findMany({ include: { participations: true, merchant: true }, orderBy: { createdAt: "desc" } }),
    db.payment.groupBy({ by: ["kind"], _sum: { amountHalalas: true } }),
    db.participation.findMany({ where: { status: { in: [P.VIEWS_SUBMITTED, P.VIEWS_APPROVED] } }, include: { creator: true, campaign: true }, orderBy: { updatedAt: "asc" } }),
  ]);
  const settings = await getSettings();
  const rows = campaigns.map((c) => ({ c, t: campaignTotals(c, c.participations) }));
  const paySum = (k: string) => payments.find((p) => p.kind === k)?._sum.amountHalalas ?? 0;
  const gross = rows.reduce((a, r) => a + r.t.gross, 0);
  const commission = rows.reduce((a, r) => a + r.t.commission, 0);
  const views = rows.reduce((a, r) => a + r.t.approvedViews, 0);
  const received = paySum("DEPOSIT") + paySum("FINAL") - paySum("REFUND");
  const active = campaigns.filter((c) => c.status === C.OPEN || c.status === C.CLOSED).length;
  const name = (c: (typeof campaigns)[number]) => `${c.productName} · ${c.merchant.storeName || c.merchant.name}`;

  return (
    <>
      <PageTitle title="لوحة المشرف" />
      {!settings.bankIban && (
        <p className="mb-6 border-s-4 border-flame bg-flame-tint px-3 py-2 font-medium">
          ما أضفت الحساب البنكي للحين، والتجار ما يقدرون يحوّلون العربون بدونه. <Link href="/admin/settings" className="font-semibold underline">أضفه من الإعدادات</Link>.
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-6 border-y-[1.5px] border-ink lg:grid-cols-4">
        <Stat label="التجار"><Num n={merchants} /></Stat>
        <Stat label="صنّاع المحتوى"><Num n={creators} /></Stat>
        <Stat label="الحملات" sub={<><Num n={active} className="text-sm text-ink" /> شغّالة الحين</>}><Num n={campaigns.length} /></Stat>
        <Stat label="مشاهدات معتمدة" accent><Num n={views} /></Stat>
      </div>
      <div className="grid grid-cols-2 gap-x-6 border-b-[1.5px] border-ink lg:grid-cols-4">
        <Stat label="إجمالي المستحق على التجار"><Sar h={gross} /></Stat>
        <Stat label="استلمنا من التجار" sub="عربون + متبقي − مسترد"><Sar h={received} /></Stat>
        <Stat label="حوّلنا للصنّاع" sub={<>باقي <Sar h={rows.reduce((a, r) => a + r.t.net - r.t.paidOut, 0)} className="text-sm text-ink" /></>}><Sar h={paySum("PAYOUT")} /></Stat>
        <Stat label="عمولة المنصة"><Sar h={commission} /></Stat>
      </div>

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Queue title="عربون ينتظر التأكيد" empty="ما فيه عربون ينتظر."
          items={rows.filter((r) => r.c.status === C.DEPOSIT_REPORTED).map(({ c }) => ({ href: `/admin/campaigns/${c.id}`, main: name(c), sub: `مرجع: ${c.depositReference ?? "—"}`, amount: <Sar h={c.depositHalalas} className="text-2xl" /> }))} />
        <Queue title="مشاهدات تنتظر الاعتماد" empty="ما فيه مشاهدات تنتظر."
          items={queueParts.filter((p) => p.status === P.VIEWS_SUBMITTED).map((p) => ({ href: `/admin/campaigns/${p.campaignId}#p-${p.id}`, main: p.creator.name, sub: p.campaign.productName, amount: <Num n={p.reportedViews ?? 0} className="text-2xl" /> }))} />
        <Queue title="تحويلات مستحقة للصنّاع" empty="ما فيه تحويلات مستحقة."
          items={queueParts.filter((p) => p.status === P.VIEWS_APPROVED).map((p) => ({ href: `/admin/campaigns/${p.campaignId}#p-${p.id}`, main: p.creator.name, sub: p.campaign.productName, amount: <Sar h={p.netHalalas ?? 0} className="text-2xl" /> }))} />
        <Queue title="حملات تنتظر التسوية" empty="ما فيه حملات تنتظر التسوية."
          items={rows.filter((r) => r.c.status === C.COMPLETED).map(({ c, t }) => ({ href: `/admin/campaigns/${c.id}`, main: name(c), sub: t.balance > 0 ? "متبقي على التاجر" : t.balance < 0 ? "مسترد للتاجر" : "بدون فرق", amount: <Sar h={Math.abs(t.balance)} className="text-2xl" /> }))} />
      </div>

      <Section title="آخر الحملات" aside={<Link href="/admin/campaigns" className="text-sm font-semibold underline">الكل</Link>}>
        <ul className="border-[1.5px] border-ink bg-card">
          {rows.slice(0, 5).map(({ c }, i) => (
            <li key={c.id} className={i ? "border-t border-line" : ""}>
              <Link href={`/admin/campaigns/${c.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-white">
                <span className="min-w-0 truncate font-semibold">{name(c)}</span>
                <StatusBadge kind="campaign" status={c.status} />
              </Link>
            </li>
          ))}
          {rows.length === 0 && <li className="px-4 py-6 text-center text-mute">ما فيه حملات للحين.</li>}
        </ul>
      </Section>
    </>
  );
}
