import { requireRole } from "@/lib/auth";
import { updateProfileAction } from "@/lib/actions";
import { PageTitle } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { PasswordForm } from "@/components/password-form";

export const metadata = { title: "حسابي" };

export default async function MerchantAccount() {
  const u = await requireRole("MERCHANT");
  return (
    <>
      <PageTitle title="حسابي" sub={<span dir="ltr">{u.email}</span>} />
      <ActionForm action={updateProfileAction} className="max-w-xl space-y-4">
        <div><label className="label" htmlFor="name">الاسم</label><input className="field" id="name" name="name" required defaultValue={u.name} maxLength={80} /></div>
        <div><label className="label" htmlFor="storeName">اسم المتجر</label><input className="field" id="storeName" name="storeName" defaultValue={u.storeName ?? ""} maxLength={80} /></div>
        <div><label className="label" htmlFor="storeUrl">رابط المتجر</label><input className="field" id="storeUrl" name="storeUrl" dir="ltr" defaultValue={u.storeUrl ?? ""} maxLength={300} placeholder="https://" /></div>
        <div><label className="label" htmlFor="phone">الجوال</label><input className="field" id="phone" name="phone" dir="ltr" inputMode="tel" defaultValue={u.phone ?? ""} maxLength={20} /></div>
        <Submit>احفظ</Submit>
      </ActionForm>
      <PasswordForm />
    </>
  );
}
