import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, homeFor } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { LoginForm } from "@/components/auth-forms";

export const metadata = { title: "دخول" };

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect(homeFor(user.role));
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <Logo />
      <div className="my-auto py-10">
        <h1 className="mb-6 text-4xl">ادخل حسابك</h1>
        <LoginForm />
        <p className="mt-5 text-center text-[0.95rem]">
          جديد؟ <Link href="/register?role=merchant" className="font-semibold underline decoration-flame decoration-2">سجّل كتاجر</Link> أو{" "}
          <Link href="/register?role=creator" className="font-semibold underline decoration-flame decoration-2">كصانع محتوى</Link>
        </p>
      </div>
    </main>
  );
}
