"use client";

import { useState } from "react";
import Link from "next/link";
import { loginAction, registerAction } from "@/lib/actions";
import { ActionForm, Submit } from "./forms";

export function LoginForm() {
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">الإيميل</label>
        <input className="field" id="email" name="email" type="email" dir="ltr" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">كلمة المرور</label>
        <input className="field" id="password" name="password" type="password" dir="ltr" autoComplete="current-password" required />
      </div>
      <Submit variant="flame" className="w-full">دخول</Submit>
    </ActionForm>
  );
}

export function RegisterForm({ initialRole }: { initialRole: "MERCHANT" | "CREATOR" }) {
  const [role, setRole] = useState(initialRole);
  return (
    <ActionForm action={registerAction} className="space-y-4">
      <fieldset>
        <legend className="label">نوع الحساب</legend>
        <div className="grid grid-cols-2 gap-2">
          {([["MERCHANT", "تاجر"], ["CREATOR", "صانع محتوى"]] as const).map(([v, label]) => (
            <label key={v}>
              <input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} className="peer sr-only" />
              <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-[3px] border-[1.5px] border-ink font-semibold peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-[2.5px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-flame">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="name">الاسم</label>
        <input className="field" id="name" name="name" autoComplete="name" required maxLength={80} />
      </div>
      {role === "MERCHANT" ? (
        <div>
          <label className="label" htmlFor="storeName">اسم المتجر</label>
          <input className="field" id="storeName" name="storeName" maxLength={80} />
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="city">المدينة</label>
          <input className="field" id="city" name="city" maxLength={60} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">الإيميل</label>
        <input className="field" id="email" name="email" type="email" dir="ltr" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">كلمة المرور</label>
        <input className="field" id="password" name="password" type="password" dir="ltr" autoComplete="new-password" required minLength={8} />
        <p className="hint mt-1">8 أحرف على الأقل.</p>
      </div>
      <Submit variant="flame" className="w-full">{role === "MERCHANT" ? "سجّل كتاجر" : "سجّل كصانع محتوى"}</Submit>
      <p className="text-center text-[0.95rem]">
        عندك حساب؟ <Link href="/login" className="font-semibold underline decoration-flame decoration-2">ادخل</Link>
      </p>
    </ActionForm>
  );
}
