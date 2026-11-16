import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser, homeFor } from "@/lib/auth";
import { P } from "@/lib/status";
import { ExtLink, LinkLines, Logo, Num, Section, Stat } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, select: { name: true, role: true } });
  return { title: u?.role === "CREATOR" ? u.name : "صانع محتوى" };
}

/** الملف العام لصانع المحتوى. ما فيه إيميل ولا جوال ولا آيبان. */
export default async function PublicProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [u, viewer] = await Promise.all([db.user.findUnique({ where: { id } }), getUser()]);
  if (!u || u.role !== "CREATOR") notFound();
  const done = await db.participation.findMany({ where: { creatorId: id, status: { in: [P.VIEWS_APPROVED, P.PAID] } }, select: { approvedViews: true } });
  const views = done.reduce((a, p) => a + (p.approvedViews ?? 0), 0);
  const accounts: [string, string | null][] = [["تيك توك", u.tiktok], ["انستقرام", u.instagram], ["سناب شات", u.snapchat]];

  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href={viewer ? homeFor(viewer.role) : "/login"} className="btn btn-line btn-sm">{viewer ? "لوحة التحكم" : "دخول"}</Link>
      </header>
      <main className="mt-10">
        <p className="eyebrow">صانع محتوى</p>
        <h1 className="mt-1 text-5xl">{u.name}</h1>
        <p className="mt-2 text-lg text-mute">{[u.city, u.niche].filter(Boolean).join(" · ") || "ما أضاف مدينته وتخصصه"}</p>
        {u.bio && <p className="mt-4 whitespace-pre-line break-words">{u.bio}</p>}

        <div className="mt-8 grid grid-cols-2 gap-x-6 border-y-[1.5px] border-ink">
          <Stat label="حملات مكتملة على ألف"><Num n={done.length} /></Stat>
          <Stat label="مشاهدات معتمدة" accent><Num n={views} /></Stat>
        </div>

        <Section title="الحسابات">
          {accounts.some(([, v]) => v) ? (
            <ul className="space-y-2">
              {accounts.filter(([, v]) => v).map(([label, v]) => (
                <li key={label} className="row"><span className="font-semibold">{label}</span><span className="dots" />{/^https?:\/\//.test(v!) ? <ExtLink href={v!} /> : <span dir="ltr">{v}</span>}</li>
              ))}
            </ul>
          ) : <p className="text-mute">ما أضاف حساباته.</p>}
        </Section>
        <Section title="أعمال سابقة">{u.portfolio ? <LinkLines text={u.portfolio} /> : <p className="text-mute">ما أضاف أعمال.</p>}</Section>
      </main>
    </div>
  );
}
