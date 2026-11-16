import Link from "next/link";
import { CAMPAIGN_STATUS, PARTICIPATION_STATUS, statusLabel, type Tone } from "@/lib/status";
import { formatInt, formatSar } from "@/lib/money";

/** الشعار: كلمة «ألف» وبعدها ثلاث معيّنات = أصفار الألف الثلاثة (الصفر العربي نقطة معيّنة). */
export function Logo({ size = "md", href = "/" }: { size?: "md" | "lg"; href?: string }) {
  const lg = size === "lg";
  return (
    <Link href={href} aria-label="ألف — الرئيسية" className="inline-flex items-center gap-2 no-underline">
      <span className={`font-display leading-none ${lg ? "text-5xl" : "text-[2rem]"}`}>ألف</span>
      <span aria-hidden className={`flex ${lg ? "gap-[7px]" : "gap-[5px]"} translate-y-[0.25em]`}>
        {[0, 1, 2].map((i) => (
          <i key={i} className={`block rotate-45 bg-flame ${lg ? "size-[9px]" : "size-[6px]"}`} />
        ))}
      </span>
    </Link>
  );
}

export function Num({ n, className = "" }: { n: number; className?: string }) {
  return <span className={`num ${className}`}>{formatInt(n)}</span>;
}

/** مبلغ بالريال. الرقم بخط العرض والعملة صغيرة جنبه. */
export function Sar({ h, className = "", unit = true }: { h: number; className?: string; unit?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className={`num ${className}`}>{formatSar(h)}</span>
      {unit && <span className="font-sans text-[0.85rem] font-medium leading-none text-mute">ر.س</span>}
    </span>
  );
}

const TONE: Record<Tone, string> = {
  act: "bg-flame text-white border-flame",
  wait: "bg-transparent text-ink border-ink border-dashed",
  done: "bg-ink text-paper border-ink",
  off: "bg-transparent text-mute border-line line-through",
};

export function StatusBadge({ kind, status }: { kind: "campaign" | "participation"; status: string }) {
  const tone = (kind === "campaign" ? CAMPAIGN_STATUS[status]?.tone : PARTICIPATION_STATUS[status]?.tone) ?? "wait";
  return (
    <span className={`inline-block whitespace-nowrap rounded-[3px] border-[1.5px] px-2 py-0.5 text-[0.8rem] font-semibold leading-relaxed ${TONE[tone]}`}>
      {statusLabel(kind, status)}
    </span>
  );
}

/** رقم كبير مع عنوانه. أساس كل لوحات التحكم. */
export function Stat({ label, children, sub, accent = false }: { label: string; children: React.ReactNode; sub?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 py-4">
      <span className="eyebrow">{label}</span>
      <span className={`text-[2.1rem] leading-none sm:text-5xl ${accent ? "text-flame" : ""}`}>{children}</span>
      {sub && <span className="hint">{sub}</span>}
    </div>
  );
}

export function Row({ label, children, total = false }: { label: React.ReactNode; children: React.ReactNode; total?: boolean }) {
  return (
    <div className={`row ${total ? "row-total" : ""}`}>
      <span>{label}</span>
      <span className="dots" aria-hidden />
      <span className={total ? "text-2xl" : "text-lg"}>{children}</span>
    </div>
  );
}

/** مقياس المصروف مقابل السقف، بتدريج مثل المسطرة. */
export function Gauge({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="img" aria-label={label ?? `${pct}%`}>
      <div className="relative h-4 border-[1.5px] border-ink bg-card">
        <div className="absolute inset-y-0 right-0 bg-flame" style={{ width: `${pct}%` }} />
      </div>
      <div className="ticks mt-1" />
    </div>
  );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[2rem] sm:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-mute">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b-[1.5px] border-ink pb-2">
        <h2 className="text-2xl">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="border-[1.5px] border-dashed border-ink/40 px-4 py-8 text-center text-mute">{children}</div>;
}

export function ExtLink({ href, children }: { href: string; children?: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" dir="ltr" className="break-all font-medium underline decoration-flame decoration-2">
      {children ?? href.replace(/^https?:\/\/(www\.)?/, "")}
    </a>
  );
}

/** نص حر فيه روابط (سطر لكل رابط). الروابط تنعرض كروابط والباقي نص. */
export function LinkLines({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <ul className="space-y-1">
      {text.split(/\s*\n\s*/).filter(Boolean).map((line, i) => (
        <li key={i}>{/^https?:\/\/\S+$/.test(line) ? <ExtLink href={line} /> : <span className="break-words">{line}</span>}</li>
      ))}
    </ul>
  );
}

export function formatDate(d: Date | null | undefined, withTime = false) {
  if (!d) return "";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}), timeZone: "Asia/Riyadh",
  }).format(d);
}

type Ev = { id: string; participationId: string | null; fromStatus: string | null; toStatus: string; note: string | null; createdAt: Date; actor: { name: string; role: string } | null; participation?: { creator: { name: string } } | null };
const ROLE_AR: Record<string, string> = { ADMIN: "المشرف", MERCHANT: "التاجر", CREATOR: "صانع المحتوى" };

/** السجل الزمني لكل تغيير حالة */
export function Timeline({ events, showCreator = false }: { events: Ev[]; showCreator?: boolean }) {
  if (!events.length) return <Empty>ما فيه سجل للحين.</Empty>;
  return (
    <ol className="relative ms-1 border-s-[1.5px] border-ink ps-5">
      {events.map((e) => {
        const kind = e.participationId ? "participation" : "campaign";
        return (
          <li key={e.id} className="relative pb-5 last:pb-0">
            <i aria-hidden className="absolute -start-[26px] top-2 block size-[9px] rotate-45 bg-flame" />
            <p className="font-semibold">
              {showCreator && e.participation ? <span className="text-mute">{e.participation.creator.name}: </span> : null}
              {statusLabel(kind, e.toStatus)}
            </p>
            {e.note && <p className="text-[0.95rem] break-words">{e.note}</p>}
            <p className="hint">
              {formatDate(e.createdAt, true)} · {e.actor ? ROLE_AR[e.actor.role] ?? e.actor.name : "تلقائي"}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
