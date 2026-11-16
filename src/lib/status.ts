// الحالات كلها هنا: الأسماء، الترجمة، وشكل الشارة.
// tone: wait = بانتظار طرف آخر، act = يحتاج إجراء، done = مكتمل، off = ملغي/مرفوض

export type Tone = "wait" | "act" | "done" | "off";

export const ROLE = { MERCHANT: "MERCHANT", CREATOR: "CREATOR", ADMIN: "ADMIN" } as const;
export type Role = keyof typeof ROLE;

export const PLATFORMS: Record<string, string> = {
  TIKTOK: "تيك توك",
  INSTAGRAM: "انستقرام",
  SNAPCHAT: "سناب شات",
};

export const C = {
  AWAITING_DEPOSIT: "AWAITING_DEPOSIT",
  DEPOSIT_REPORTED: "DEPOSIT_REPORTED",
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  COMPLETED: "COMPLETED",
  SETTLED: "SETTLED",
  CANCELLED: "CANCELLED",
} as const;

export const CAMPAIGN_STATUS: Record<string, { label: string; tone: Tone; hint: string }> = {
  AWAITING_DEPOSIT: { label: "بانتظار العربون", tone: "act", hint: "التاجر ما حوّل العربون للحين" },
  DEPOSIT_REPORTED: { label: "العربون قيد التأكيد", tone: "wait", hint: "التاجر بلّغ بالتحويل، والمشرف يتأكد من وصوله" },
  OPEN: { label: "مفتوحة للتقديم", tone: "done", hint: "منشورة لصنّاع المحتوى" },
  CLOSED: { label: "التقديم مقفل", tone: "wait", hint: "الصنّاع المقبولين يكمّلون شغلهم" },
  COMPLETED: { label: "بانتظار التسوية", tone: "act", hint: "كل المشاهدات انحسبت، باقي تسوية المبلغ النهائي" },
  SETTLED: { label: "مسوّاة", tone: "done", hint: "انتهت الحملة وتسوّى حسابها" },
  CANCELLED: { label: "ملغية", tone: "off", hint: "" },
};

export const P = {
  APPLIED: "APPLIED",
  REJECTED: "REJECTED",
  ACCEPTED: "ACCEPTED",
  DRAFT_SUBMITTED: "DRAFT_SUBMITTED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  DRAFT_APPROVED: "DRAFT_APPROVED",
  PUBLISHED: "PUBLISHED",
  VIEWS_SUBMITTED: "VIEWS_SUBMITTED",
  VIEWS_REJECTED: "VIEWS_REJECTED",
  VIEWS_APPROVED: "VIEWS_APPROVED",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;

export const PARTICIPATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  APPLIED: { label: "طلب جديد", tone: "wait" },
  REJECTED: { label: "مرفوض", tone: "off" },
  ACCEPTED: { label: "مقبول، بانتظار المسودة", tone: "wait" },
  DRAFT_SUBMITTED: { label: "المسودة عند التاجر", tone: "wait" },
  REVISION_REQUESTED: { label: "مطلوب تعديل", tone: "act" },
  DRAFT_APPROVED: { label: "المسودة معتمدة، بانتظار النشر", tone: "wait" },
  PUBLISHED: { label: "منشور، بانتظار المشاهدات", tone: "wait" },
  VIEWS_SUBMITTED: { label: "المشاهدات قيد المراجعة", tone: "wait" },
  VIEWS_REJECTED: { label: "المشاهدات مرفوضة", tone: "act" },
  VIEWS_APPROVED: { label: "معتمد، بانتظار التحويل", tone: "done" },
  PAID: { label: "تم التحويل", tone: "done" },
  CANCELLED: { label: "ملغية", tone: "off" },
};

/** مشاركات تحجز مقعد من مقاعد الحملة */
export const SEAT_STATUSES: string[] = [
  P.ACCEPTED, P.DRAFT_SUBMITTED, P.REVISION_REQUESTED, P.DRAFT_APPROVED,
  P.PUBLISHED, P.VIEWS_SUBMITTED, P.VIEWS_REJECTED, P.VIEWS_APPROVED, P.PAID,
];
/** مشاركات انتهت ولا ينتظر منها شي */
export const FINAL_STATUSES: string[] = [P.REJECTED, P.CANCELLED, P.VIEWS_APPROVED, P.PAID];
/** مشاركات لها مستحق محسوب */
export const EARNED_STATUSES: string[] = [P.VIEWS_APPROVED, P.PAID];

export const PAYMENT_KIND: Record<string, string> = {
  DEPOSIT: "عربون من التاجر",
  FINAL: "المتبقي من التاجر",
  REFUND: "مسترد للتاجر",
  PAYOUT: "تحويل لصانع محتوى",
};

export function statusLabel(kind: "campaign" | "participation", s: string | null | undefined): string {
  if (!s) return "";
  return (kind === "campaign" ? CAMPAIGN_STATUS[s]?.label : PARTICIPATION_STATUS[s]?.label) ?? s;
}
