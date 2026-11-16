import { resetPasswordAction } from "@/lib/actions";
import { Logo } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "كلمة مرور جديدة", robots: { index: false } };

export default async function Reset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <Logo />
      <div className="my-auto py-10">
        <h1 className="mb-6 text-4xl">كلمة مرور جديدة</h1>
        <ActionForm action={resetPasswordAction} hidden={{ token }} className="space-y-4">
          <div>
            <label className="label" htmlFor="next">كلمة المرور الجديدة</label>
            <input className="field" id="next" name="next" type="password" dir="ltr" autoComplete="new-password" required minLength={8} />
            <p className="hint mt-1">8 أحرف على الأقل. بعد الحفظ تطلع من كل الأجهزة وتدخل من جديد.</p>
          </div>
          <Submit variant="flame" className="w-full">احفظ</Submit>
        </ActionForm>
      </div>
    </main>
  );
}
