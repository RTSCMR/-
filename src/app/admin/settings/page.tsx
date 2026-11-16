import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { updateSettingsAction } from "@/lib/actions";
import { PageTitle } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "الإعدادات" };

export default async function Settings() {
  await requireRole("ADMIN");
  const s = await getSettings();
  return (
    <>
      <PageTitle title="الإعدادات" sub="النسب تنطبق على الحملات الجديدة. الحملات القائمة تبقى على نسبها وقت الإنشاء." />
      <ActionForm action={updateSettingsAction} className="max-w-2xl space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="depositPercent">نسبة العربون %</label>
            <input className="field num !text-4xl" id="depositPercent" name="depositPercent" inputMode="numeric" required defaultValue={s.depositPercent} />
            <p className="hint mt-1">من سقف الميزانية.</p>
          </div>
          <div>
            <label className="label" htmlFor="commissionPercent">عمولة المنصة %</label>
            <input className="field num !text-4xl" id="commissionPercent" name="commissionPercent" inputMode="numeric" required defaultValue={s.commissionPercent} />
            <p className="hint mt-1">من مستحق الصانع.</p>
          </div>
          <div>
            <label className="label" htmlFor="viewsWaitDays">أيام قبل إدخال المشاهدات</label>
            <input className="field num !text-4xl" id="viewsWaitDays" name="viewsWaitDays" inputMode="numeric" required defaultValue={s.viewsWaitDays} />
            <p className="hint mt-1">من تاريخ النشر.</p>
          </div>
        </div>
        <div className="border-t-[1.5px] border-ink pt-5">
          <p className="mb-3 font-semibold">الحساب البنكي اللي يحوّل عليه التاجر</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="bankName">البنك</label><input className="field" id="bankName" name="bankName" defaultValue={s.bankName} maxLength={80} /></div>
            <div><label className="label" htmlFor="bankAccountName">اسم الحساب</label><input className="field" id="bankAccountName" name="bankAccountName" defaultValue={s.bankAccountName} maxLength={120} /></div>
          </div>
          <div className="mt-4"><label className="label" htmlFor="bankIban">الآيبان</label><input className="field" id="bankIban" name="bankIban" dir="ltr" defaultValue={s.bankIban} maxLength={40} placeholder="SA" /></div>
        </div>
        <Submit>احفظ الإعدادات</Submit>
      </ActionForm>
    </>
  );
}
