import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PAYMENT_KIND } from "@/lib/status";
import { Empty, PageTitle, Sar, Stat, formatDate } from "@/components/ui";

export const metadata = { title: "التحويلات" };

export default async function Payments() {
  await requireRole("ADMIN");
  const payments = await db.payment.findMany({ include: { campaign: true, participation: { include: { creator: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
  const sum = (k: string) => payments.filter((p) => p.kind === k).reduce((a, p) => a + p.amountHalalas, 0);
  const inflow = sum("DEPOSIT") + sum("FINAL");
  const outflow = sum("PAYOUT") + sum("REFUND");
  return (
    <>
      <PageTitle title="التحويلات" sub="كل تحويل بنكي تسجّل في المنصة. التسجيل يتم من صفحة الحملة." />
      <div className="grid grid-cols-2 gap-x-6 border-y-[1.5px] border-ink lg:grid-cols-3">
        <Stat label="داخل (من التجار)"><Sar h={inflow} /></Stat>
        <Stat label="طالع (صنّاع + مسترد)"><Sar h={outflow} /></Stat>
        <Stat label="الرصيد عند المنصة" accent><Sar h={inflow - outflow} /></Stat>
      </div>
      <div className="mt-8">
        {payments.length === 0 ? <Empty>ما تسجّل أي تحويل للحين.</Empty> : (
          <ul className="border-[1.5px] border-ink bg-card">
            {payments.map((p, i) => {
              const out = p.kind === "PAYOUT" || p.kind === "REFUND";
              return (
                <li key={p.id} className={i ? "border-t border-line" : ""}>
                  <Link href={`/admin/campaigns/${p.campaignId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white">
                    <span className="min-w-0">
                      <span className="block font-semibold">{PAYMENT_KIND[p.kind]}{p.participation ? ` · ${p.participation.creator.name}` : ""}</span>
                      <span className="hint block truncate">{p.campaign.productName} · {formatDate(p.createdAt, true)}{p.reference ? ` · ${p.reference}` : ""}</span>
                    </span>
                    <Sar h={out ? -p.amountHalalas : p.amountHalalas} className={`text-2xl ${out ? "" : "text-flame"}`} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
