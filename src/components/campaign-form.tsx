"use client";

import { useState } from "react";
import { createCampaignAction } from "@/lib/actions";
import { creatorCap, depositAmount, expectedViews, formatInt, formatSar, parseIntStrict, parseSar } from "@/lib/money";
import { ActionForm, Submit } from "./forms";

const PLATFORM_OPTIONS = [["TIKTOK", "تيك توك"], ["INSTAGRAM", "انستقرام"], ["SNAPCHAT", "سناب شات"]] as const;

export function CampaignForm({ depositPercent, commissionPercent, defaultStoreUrl }: { depositPercent: number; commissionPercent: number; defaultStoreUrl: string }) {
  const [budget, setBudget] = useState("3000");
  const [cpm, setCpm] = useState("15");
  const [creators, setCreators] = useState("3");

  const b = parseSar(budget) ?? 0;
  const c = parseSar(cpm) ?? 0;
  const n = Math.max(1, parseIntStrict(creators) ?? 1);
  const views = expectedViews(b, c);
  const dep = depositAmount(b, depositPercent);
  const cap = creatorCap(b, n);

  return (
    <ActionForm action={createCampaignAction} className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="productName">المنتج</label>
          <input className="field" id="productName" name="productName" required maxLength={120} placeholder="مثال: عطر عود 50 مل" />
        </div>
        <div>
          <label className="label" htmlFor="storeUrl">رابط المتجر أو المنتج</label>
          <input className="field" id="storeUrl" name="storeUrl" type="url" dir="ltr" required defaultValue={defaultStoreUrl} placeholder="https://" />
        </div>
        <div>
          <label className="label" htmlFor="brief">وصف المطلوب</label>
          <textarea className="field" id="brief" name="brief" required maxLength={3000} rows={6} placeholder="وش تبي صانع المحتوى يسوي؟ نوع الفيديو، النقاط اللي لازم تنذكر، واللي ما تبيه." />
          <p className="hint mt-1">كل ما كان الوصف أوضح، قلّت التعديلات على المسودة.</p>
        </div>

        <fieldset>
          <legend className="label">المنصة</legend>
          <div className="grid grid-cols-3 gap-2">
            {PLATFORM_OPTIONS.map(([v, label], i) => (
              <label key={v} className="relative">
                <input type="radio" name="platform" value={v} defaultChecked={i === 0} className="peer sr-only" />
                <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-[3px] border-[1.5px] border-ink px-2 text-center font-semibold peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-[2.5px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-flame">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="cpm">سعر الألف مشاهدة (ر.س)</label>
            <input className="field num !text-2xl" id="cpm" name="cpm" inputMode="decimal" required value={cpm} onChange={(e) => setCpm(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="budget">سقف الميزانية (ر.س)</label>
            <input className="field num !text-2xl" id="budget" name="budget" inputMode="decimal" required value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="durationDays">مدة الحملة (يوم)</label>
            <input className="field num !text-2xl" id="durationDays" name="durationDays" inputMode="numeric" required defaultValue="14" />
          </div>
          <div>
            <label className="label" htmlFor="maxCreators">عدد صنّاع المحتوى</label>
            <input className="field num !text-2xl" id="maxCreators" name="maxCreators" inputMode="numeric" required value={creators} onChange={(e) => setCreators(e.target.value)} />
          </div>
        </div>
        <p className="hint">المدة هي فترة استقبال الطلبات بعد نشر الحملة. والميزانية تتقسم بالتساوي على عدد الصنّاع، وكل واحد ما يتجاوز حصته.</p>

        <label className="flex cursor-pointer items-start gap-3 border-[1.5px] border-ink p-3">
          <input type="checkbox" name="saudiOnly" defaultChecked className="mt-1 size-5 accent-[var(--color-flame)]" />
          <span>
            <span className="font-semibold">الجمهور لازم يكون سعودي</span>
            <span className="hint block">المشرف يتأكد من لقطة الإحصائيات إن أغلب المشاهدات من السعودية قبل الاعتماد.</span>
          </span>
        </label>
      </div>

      {/* الحاسبة المباشرة */}
      <aside className="card p-5 lg:sticky lg:top-24" aria-live="polite">
        <p className="eyebrow">المشاهدات المتوقعة</p>
        <p className="num mt-2 text-6xl text-flame">{formatInt(views)}</p>
        <p className="hint mt-2">الميزانية ÷ سعر الألف × 1,000</p>
        <div className="ticks my-4" />
        <div className="row"><span>حصة كل صانع من السقف</span><span className="dots" /><span className="whitespace-nowrap"><span className="num text-xl">{formatSar(cap)}</span> <span className="text-sm text-mute">ر.س</span></span></div>
        <div className="row"><span>عمولة المنصة، من ضمن المبلغ</span><span className="dots" /><span className="num text-xl">{commissionPercent}%</span></div>
        <div className="row row-total"><span>العربون المطلوب الآن ({depositPercent}%)</span><span className="dots" /><span className="whitespace-nowrap"><span className="num text-3xl">{formatSar(dep)}</span> <span className="text-sm text-mute">ر.س</span></span></div>
        <p className="hint mt-3">العربون ينخصم من الحساب النهائي. الحملة تنتشر لصنّاع المحتوى بعد ما نأكد استلامه.</p>
        <Submit variant="flame" className="mt-5 w-full">أنشئ الحملة</Submit>
      </aside>
    </ActionForm>
  );
}
