import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { C, PLATFORMS, SEAT_STATUSES } from "@/lib/status";
import { creatorCap } from "@/lib/money";
import { Empty, Num, PageTitle, Sar, formatDate } from "@/components/ui";

export const metadata = { title: "الحملات المفتوحة" };

export default async function Browse({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const user = await requireRole("CREATOR");
  const { platform } = await searchParams;
  const filter = platform && PLATFORMS[platform] ? platform : undefined;
  const campaigns = await db.campaign.findMany({
    where: { status: C.OPEN, endsAt: { gt: new Date() }, ...(filter ? { platform: filter } : {}) },
    include: { merchant: { select: { storeName: true, name: true } }, participations: { select: { creatorId: true, status: true } } },
    orderBy: { openedAt: "desc" },
  });

  return (
    <>
      <PageTitle title="الحملات المفتوحة" sub="السعر مكتوب على كل حملة. قدّم على اللي يناسب محتواك." />
      <div className="mb-5 flex flex-wrap gap-2">
        {[["", "الكل"], ...Object.entries(PLATFORMS)].map(([v, label]) => (
          <Link key={v} href={v ? `/creator/campaigns?platform=${v}` : "/creator/campaigns"}
            className={`rounded-[3px] border-[1.5px] border-ink px-3 py-1.5 text-[0.95rem] font-semibold ${(filter ?? "") === v ? "bg-ink text-paper" : ""}`}>
            {label}
          </Link>
        ))}
      </div>
      {campaigns.length === 0 ? (
        <Empty>ما فيه حملات مفتوحة الحين. ارجع بعدين.</Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => {
            const mine = c.participations.some((p) => p.creatorId === user.id);
            const seats = c.participations.filter((p) => SEAT_STATUSES.includes(p.status)).length;
            return (
              <li key={c.id}>
                <Link href={`/creator/campaigns/${c.id}`} className="card flex h-full flex-col p-4 no-underline hover:bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl">{c.productName}</h2>
                      <p className="hint">{c.merchant.storeName || c.merchant.name} · {PLATFORMS[c.platform]}{c.saudiOnly ? " · جمهور سعودي" : ""}</p>
                    </div>
                    {mine && <span className="whitespace-nowrap rounded-[3px] bg-ink px-2 py-0.5 text-sm font-semibold text-paper">قدّمت</span>}
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">لكل ألف مشاهدة</p>
                      <Sar h={c.cpmHalalas} className="mt-1 text-5xl text-flame" />
                    </div>
                    <div className="text-end">
                      <p className="eyebrow">أقصى مستحق للصانع</p>
                      <Sar h={creatorCap(c.budgetHalalas, c.maxCreators)} className="mt-1 text-2xl" />
                    </div>
                  </div>
                  <div className="ticks my-3" />
                  <p className="hint mt-auto">
                    المقاعد <Num n={seats} className="text-sm text-ink" /> من <Num n={c.maxCreators} className="text-sm text-ink" /> · التقديم لين {formatDate(c.endsAt)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
