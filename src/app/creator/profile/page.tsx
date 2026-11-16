import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { updateProfileAction } from "@/lib/actions";
import { PageTitle } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "ملفي" };

export default async function Profile({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const u = await requireRole("CREATOR");
  const { welcome } = await searchParams;
  return (
    <>
      <PageTitle title="ملفي" sub="هذا اللي يشوفه التاجر لما تقدّم على حملته."
        action={<Link href={`/creators/${u.id}`} className="btn btn-line btn-sm">شوف ملفك العام</Link>} />
      {welcome && <p className="mb-6 border-s-4 border-flame bg-flame-tint px-3 py-2 font-medium">حيّاك. كمّل ملفك أول، وبعدها <Link href="/creator/campaigns" className="font-semibold underline">تصفّح الحملات</Link>.</p>}
      <ActionForm action={updateProfileAction} className="max-w-2xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="name">الاسم</label><input className="field" id="name" name="name" required defaultValue={u.name} maxLength={80} /></div>
          <div><label className="label" htmlFor="city">المدينة</label><input className="field" id="city" name="city" defaultValue={u.city ?? ""} maxLength={60} placeholder="الرياض" /></div>
        </div>
        <div><label className="label" htmlFor="niche">التخصص</label><input className="field" id="niche" name="niche" defaultValue={u.niche ?? ""} maxLength={80} placeholder="مثال: عطور وعناية، مطاعم، تقنية" /></div>
        <div><label className="label" htmlFor="bio">نبذة</label><textarea className="field" id="bio" name="bio" defaultValue={u.bio ?? ""} maxLength={600} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label" htmlFor="tiktok">تيك توك</label><input className="field" id="tiktok" name="tiktok" dir="ltr" defaultValue={u.tiktok ?? ""} maxLength={300} placeholder="https://" /></div>
          <div><label className="label" htmlFor="instagram">انستقرام</label><input className="field" id="instagram" name="instagram" dir="ltr" defaultValue={u.instagram ?? ""} maxLength={300} placeholder="https://" /></div>
          <div><label className="label" htmlFor="snapchat">سناب شات</label><input className="field" id="snapchat" name="snapchat" dir="ltr" defaultValue={u.snapchat ?? ""} maxLength={300} placeholder="https://" /></div>
        </div>
        <div>
          <label className="label" htmlFor="portfolio">أعمال سابقة</label>
          <textarea className="field" id="portfolio" name="portfolio" dir="ltr" defaultValue={u.portfolio ?? ""} maxLength={1500} placeholder="https://" />
          <p className="hint mt-1">رابط في كل سطر.</p>
        </div>
        <div className="border-t-[1.5px] border-ink pt-4">
          <p className="mb-3 font-semibold">بيانات التحويل <span className="hint font-normal">(ما تظهر في ملفك العام، يشوفها المشرف فقط)</span></p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="iban">الآيبان</label><input className="field" id="iban" name="iban" dir="ltr" defaultValue={u.iban ?? ""} maxLength={40} placeholder="SA" /></div>
            <div><label className="label" htmlFor="phone">الجوال</label><input className="field" id="phone" name="phone" dir="ltr" inputMode="tel" defaultValue={u.phone ?? ""} maxLength={20} /></div>
          </div>
        </div>
        <Submit>احفظ الملف</Submit>
      </ActionForm>
    </>
  );
}
