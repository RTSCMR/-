import { redirect } from "next/navigation";
import { getUser, homeFor } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = { title: "حساب جديد" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const user = await getUser();
  if (user) redirect(homeFor(user.role));
  const { role } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <Logo />
      <div className="my-auto py-10">
        <h1 className="mb-6 text-4xl">حساب جديد</h1>
        <RegisterForm initialRole={role === "creator" ? "CREATOR" : "MERCHANT"} />
      </div>
    </main>
  );
}
