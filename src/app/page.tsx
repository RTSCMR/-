import Link from "next/link";
import { getUser, homeFor } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/ui";
import { Calculator } from "@/components/calculator";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "1", title: "التاجر ينشئ حملة", body: "يكتب وش يبي، يحدد سعر الألف مشاهدة وسقف الميزانية، ويحوّل العربون. بعد ما نأكد استلامه، تنتشر الحملة." },
  { n: "2", title: "الصانع يصوّر وينشر", body: "صنّاع المحتوى يقدّمون، والتاجر يختار. الصانع يرسل مسودة الفيديو، وما ينشر إلا بعد موافقة التاجر." },
  { n: "3", title: "نعدّ المشاهدات ونحسب", body: "بعد 7 أيام من النشر، الصانع يرفع إحصائيات الفيديو ونراجعها. المبلغ ينحسب على المشاهدات المعتمدة فقط." },
];

export default async function Landing() {
  const [user, s] = await Promise.all([getUser(), getSettings()]);

  const FAQ = [
    { q: "كيف يتم الدفع؟", a: "تحويل بنكي. التاجر يحوّل العربون أول، والباقي بعد نهاية الحملة. وإحنا نحوّل لصانع المحتوى صافي مستحقه. ما فيه دفع بالبطاقة داخل المنصة حالياً." },
    { q: "وش هو العربون؟", a: `${s.depositPercent}% من سقف الميزانية، يتحول قبل نشر الحملة، وينخصم من الحساب النهائي. لو مستحقات الحملة طلعت أقل من العربون، الفرق يرجع للتاجر.` },
    { q: "لو الفيديو ما جاب مشاهدات؟", a: "التاجر يدفع على المشاهدات اللي جات فعلاً، مو على السقف. والصانع يستلم على قد مشاهداته." },
    { q: "ولو جاب مشاهدات أكثر من المتوقع؟", a: "التاجر ما يدفع فوق السقف اللي حدده. وكل صانع له حصة من السقف ما يتجاوزها، مهما زادت المشاهدات." },
    { q: "كيف تتأكدون من المشاهدات؟", a: "الصانع يرفع لقطة شاشة من إحصائيات الفيديو بعد 7 أيام من النشر، والمشرف يراجعها مع رابط المنشور قبل الاعتماد. لو الأرقام ما تطابق، تنرفض ويعيد رفعها." },
    { q: "كم تاخذ المنصة؟", a: `${s.commissionPercent}% عمولة من المبلغ المستحق على المشاهدات. تنخصم من مستحق الصانع، والتاجر ما يدفع شي فوق سعر الألف اللي حدده.` },
    { q: "أقدر أشترط إن الجمهور سعودي؟", a: "إيه. التاجر يحدد هذا الشرط وقت إنشاء الحملة، والمشرف يتأكد منه في لقطة الإحصائيات." },
  ];

  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        {user ? (
          <Link href={homeFor(user.role)} className="btn btn-sm">لوحة التحكم</Link>
        ) : (
          <Link href="/login" className="btn btn-line btn-sm">دخول</Link>
        )}
      </header>

      <main>
        {/* البطل: الرقم 1,000 هو الصورة */}
        <section className="mx-auto max-w-6xl px-5 pb-12 pt-6 sm:pt-12">
          <p className="eyebrow mb-4">سوق سعودي يجمع المتاجر الصغيرة بصنّاع المحتوى</p>
          <h1 className="max-w-3xl text-[2.9rem] leading-[1.12] sm:text-7xl">
            ادفع على المشاهدة، <span className="whitespace-nowrap text-flame">مو على الوعد.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg">
            التاجر يحدد سعر كل ألف مشاهدة. صانع المحتوى يصوّر وينشر. والحساب على المشاهدات المعتمدة، لا أكثر ولا أقل.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href="/register?role=merchant" className="btn btn-flame min-h-14 text-lg">أنا تاجر</Link>
            <Link href="/register?role=creator" className="btn btn-line min-h-14 text-lg">أنا صانع محتوى</Link>
          </div>

          <div className="mt-12 border-y-[1.5px] border-ink py-6" aria-hidden>
            <div className="flex items-end justify-between gap-4">
              <span className="num text-[5.2rem] leading-[0.85] sm:text-[11rem]">1,000</span>
              <span className="max-w-[9rem] pb-1 text-end text-sm font-semibold sm:max-w-none sm:text-lg">
                مشاهدة = وحدة الحساب.<br />ومنها جا الاسم.
              </span>
            </div>
            <div className="ticks mt-5" />
          </div>
        </section>

        <section id="calculator" className="mx-auto max-w-6xl px-5 py-10">
          <h2 className="mb-2 text-4xl sm:text-5xl">احسبها قبل تبدأ</h2>
          <p className="mb-6 max-w-xl text-mute">حرّك الأرقام وشوف وش يطلع. نفس الحسبة اللي تشتغل بها المنصة.</p>
          <Calculator depositPercent={s.depositPercent} commissionPercent={s.commissionPercent} />
        </section>

        <section id="how" className="mx-auto max-w-6xl px-5 py-10">
          <h2 className="mb-6 text-4xl sm:text-5xl">كيف تشتغل</h2>
          <ol className="grid gap-0 border-[1.5px] border-ink md:grid-cols-3">
            {STEPS.map((st, i) => (
              <li key={st.n} className={`bg-card p-6 ${i > 0 ? "border-t-[1.5px] border-ink md:border-s-[1.5px] md:border-t-0" : ""}`}>
                <span className="num text-7xl text-flame">{st.n}</span>
                <h3 className="mt-4 text-2xl">{st.title}</h3>
                <p className="mt-2">{st.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-5 py-10 md:grid-cols-2">
          <div className="flex flex-col bg-ink p-7 text-paper">
            <p className="text-sm font-semibold text-paper/70">للتاجر</p>
            <h2 className="mt-2 text-4xl">تعرف كم بتدفع قبل تبدأ</h2>
            <ul className="mt-5 space-y-3">
              <li>تحدد السعر والسقف، وما تدفع فوقه ريال.</li>
              <li>تشوف مسودة الفيديو وتوافق عليها قبل النشر.</li>
              <li>تدفع على مشاهدات معتمدة، مو على عدد المتابعين.</li>
            </ul>
            <Link href="/register?role=merchant" className="btn btn-flame mt-7 self-start">أنشئ أول حملة</Link>
          </div>
          <div className="card flex flex-col p-7">
            <p className="eyebrow">لصانع المحتوى</p>
            <h2 className="mt-2 text-4xl">دخلك على قد مشاهداتك</h2>
            <ul className="mt-5 space-y-3">
              <li>تتصفح الحملات المفتوحة وتقدّم على اللي يناسبك.</li>
              <li>السعر مكتوب قدامك من أول، بدون مفاوضات.</li>
              <li>ما تحتاج حساب كبير. اللي يهم مشاهدات الفيديو نفسه.</li>
            </ul>
            <Link href="/register?role=creator" className="btn mt-7 self-start">سجّل وتصفّح الحملات</Link>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-5 py-10">
          <h2 className="mb-4 text-4xl sm:text-5xl">أسئلة شائعة</h2>
          <div className="border-t-[1.5px] border-ink">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b-[1.5px] border-ink">
                <summary className="flex min-h-14 items-center justify-between gap-4 py-3 text-lg font-semibold">
                  {f.q}
                  <span aria-hidden className="num text-3xl text-flame transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-5 pe-8">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-10 border-t-[1.5px] border-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <Logo />
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[0.95rem] font-normal">
            <a href="#calculator">الحاسبة</a>
            <a href="#how">كيف تشتغل</a>
            <a href="#faq">أسئلة شائعة</a>
            <Link href="/login">دخول</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
