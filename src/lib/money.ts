// كل الحسابات المالية للمنصة في ملف واحد. المبالغ بالهللة (عدد صحيح).

export const HALALAS = 100;

/** يحوّل نص ريالات ("12.5") إلى هللات. يرجع null لو النص مو رقم صالح. */
export function parseSar(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const s = toLatinDigits(input).replace(/[,\s٬]/g, "").replace("٫", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * HALALAS);
}

export function parseIntStrict(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const s = toLatinDigits(input).replace(/[,\s٬]/g, "");
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

export function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** 125000 هللة → "1,250" ، 125050 → "1,250.50" */
export function formatSar(halalas: number): string {
  const neg = halalas < 0;
  const abs = Math.abs(halalas);
  const whole = Math.floor(abs / HALALAS);
  const frac = abs % HALALAS;
  const w = formatInt(whole);
  return (neg ? "-" : "") + (frac ? `${w}.${String(frac).padStart(2, "0")}` : w);
}

export function formatInt(n: number): string {
  return Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** المشاهدات المتوقعة = الميزانية ÷ سعر الألف × 1000 */
export function expectedViews(budgetHalalas: number, cpmHalalas: number): number {
  if (cpmHalalas <= 0) return 0;
  return Math.floor((budgetHalalas * 1000) / cpmHalalas);
}

/** العربون = نسبة من سقف الميزانية */
export function depositAmount(budgetHalalas: number, depositPercent: number): number {
  return Math.round((budgetHalalas * depositPercent) / 100);
}

/** حصة الصانع الواحد من السقف = السقف ÷ عدد الصنّاع المطلوبين */
export function creatorCap(budgetHalalas: number, maxCreators: number): number {
  return Math.floor(budgetHalalas / Math.max(1, maxCreators));
}

export type Earning = { gross: number; commission: number; net: number; capped: boolean };

/**
 * المستحق = (المشاهدات المعتمدة ÷ 1000) × سعر الألف، ولا يتجاوز حصة الصانع.
 * العمولة تُخصم من المستحق: التاجر يدفع gross، والصانع يستلم net.
 */
export function computeEarning(approvedViews: number, cpmHalalas: number, capHalalas: number, commissionPercent: number): Earning {
  const raw = Math.floor((approvedViews * cpmHalalas) / 1000);
  const gross = Math.min(raw, capHalalas);
  const commission = Math.round((gross * commissionPercent) / 100);
  return { gross, commission, net: gross - commission, capped: raw > capHalalas };
}

/** تكلفة الألف الفعلية = المصروف ÷ المشاهدات المعتمدة × 1000 */
export function effectiveCpm(spentHalalas: number, approvedViews: number): number | null {
  if (approvedViews <= 0) return null;
  return Math.round((spentHalalas * 1000) / approvedViews);
}
