"use client";

import { useState } from "react";
import { computeEarning, depositAmount, expectedViews, formatInt, formatSar } from "@/lib/money";

function Slider({ label, value, onChange, min, max, step, unit }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number; unit: string }) {
  const id = `s-${label}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-semibold">{label}</label>
        <span className="whitespace-nowrap">
          <span className="num text-3xl">{formatInt(value)}</span> <span className="text-sm text-mute">{unit}</span>
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} dir="rtl" className="mt-1" />
    </div>
  );
}

function Line({ label, value, unit = "ر.س", strong = false }: { label: string; value: string; unit?: string; strong?: boolean }) {
  return (
    <div className={`row ${strong ? "row-total" : ""}`}>
      <span>{label}</span>
      <span className="dots" aria-hidden />
      <span className="whitespace-nowrap">
        <span className={`num ${strong ? "text-2xl" : "text-xl"}`}>{value}</span> <span className="text-sm text-mute">{unit}</span>
      </span>
    </div>
  );
}

/** حاسبة الصفحة الرئيسية. تستخدم نفس دوال الحساب اللي تستخدمها المنصة فعلياً. */
export function Calculator({ depositPercent, commissionPercent }: { depositPercent: number; commissionPercent: number }) {
  const [mode, setMode] = useState<"merchant" | "creator">("merchant");
  const [budget, setBudget] = useState(3000);
  const [cpm, setCpm] = useState(15);
  const [views, setViews] = useState(120000);

  const budgetH = budget * 100;
  const cpmH = cpm * 100;
  const exp = expectedViews(budgetH, cpmH);
  const dep = depositAmount(budgetH, depositPercent);
  const earn = computeEarning(views, cpmH, Number.MAX_SAFE_INTEGER, commissionPercent);

  return (
    <div className="card overflow-hidden">
      <div role="tablist" aria-label="نوع الحاسبة" className="grid grid-cols-2 border-b-[1.5px] border-ink">
        {([["merchant", "أنا تاجر"], ["creator", "أنا صانع محتوى"]] as const).map(([m, label]) => (
          <button
            key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`min-h-12 px-3 font-semibold ${mode === m ? "bg-ink text-paper" : "bg-transparent"} ${m === "creator" ? "border-s-[1.5px] border-ink" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 p-5 sm:p-7 md:grid-cols-2 md:gap-10">
        <div className="space-y-6">
          {mode === "merchant" ? (
            <Slider label="سقف الميزانية" value={budget} onChange={setBudget} min={500} max={20000} step={100} unit="ر.س" />
          ) : (
            <Slider label="مشاهدات الفيديو" value={views} onChange={setViews} min={5000} max={1000000} step={5000} unit="مشاهدة" />
          )}
          <Slider label="سعر الألف مشاهدة" value={cpm} onChange={setCpm} min={5} max={60} step={1} unit="ر.س" />
          <p className="hint">
            {mode === "merchant"
              ? "السقف هو أقصى مبلغ تدفعه. لو المشاهدات أقل من المتوقع، تدفع على اللي جا فقط."
              : "هذا تقدير. المبلغ الفعلي على المشاهدات المعتمدة، وما يتجاوز حصتك من ميزانية الحملة."}
          </p>
        </div>

        <div aria-live="polite">
          {mode === "merchant" ? (
            <>
              <p className="eyebrow">المشاهدات المتوقعة</p>
              <p className="num mt-2 text-[3.4rem] text-flame sm:text-7xl">{formatInt(exp)}</p>
              <div className="ticks mt-3" />
              <div className="mt-3">
                <Line label={`العربون الآن (${depositPercent}%)`} value={formatSar(dep)} />
                <Line label="الباقي بعد الحملة، بحد أقصى" value={formatSar(budgetH - dep)} />
                <Line label="أقصى ما تدفعه" value={formatSar(budgetH)} strong />
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">صافي لك</p>
              <p className="mt-2 whitespace-nowrap">
                <span className="num text-[3.4rem] text-flame sm:text-7xl">{formatSar(earn.net)}</span> <span className="text-mute">ر.س</span>
              </p>
              <div className="ticks mt-3" />
              <div className="mt-3">
                <Line label="المستحق على المشاهدات" value={formatSar(earn.gross)} />
                <Line label={`عمولة المنصة (${commissionPercent}%)`} value={`-${formatSar(earn.commission)}`} />
                <Line label="صافي يتحول لحسابك" value={formatSar(earn.net)} strong />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
