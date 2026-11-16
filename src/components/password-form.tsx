import { changePasswordAction } from "@/lib/actions";
import { ActionForm, Submit } from "./forms";

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} className="mt-10 max-w-xl space-y-4 border-t-[1.5px] border-ink pt-6">
      <h2 className="text-2xl">كلمة المرور</h2>
      <div><label className="label" htmlFor="current">الحالية</label><input className="field" id="current" name="current" type="password" dir="ltr" autoComplete="current-password" required /></div>
      <div><label className="label" htmlFor="next">الجديدة</label><input className="field" id="next" name="next" type="password" dir="ltr" autoComplete="new-password" required minLength={8} /><p className="hint mt-1">8 أحرف على الأقل.</p></div>
      <Submit variant="line">غيّر كلمة المرور</Submit>
    </ActionForm>
  );
}
