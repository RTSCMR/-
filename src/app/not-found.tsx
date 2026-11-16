import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <Logo />
      <div className="my-auto">
        <p className="num text-[9rem] text-flame">404</p>
        <h1 className="mt-4 text-4xl">الصفحة مو موجودة</h1>
        <p className="mt-2 text-mute">يمكن الرابط غلط، أو ما عندك صلاحية تشوفها.</p>
        <Link href="/" className="btn mt-6">ارجع للرئيسية</Link>
      </div>
    </main>
  );
}
