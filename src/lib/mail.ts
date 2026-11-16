import "server-only";

// إرسال الإيميل عبر Resend (طلب HTTP واحد، بدون مكتبة).
// لو RESEND_API_KEY أو EMAIL_FROM مو موجودين، الإيميل مقفل والمنصة تشتغل عادي بالتنبيهات الداخلية.
const API_URL = process.env.RESEND_API_URL || "https://api.resend.com/emails";

export const mailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!mailEnabled()) return false;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[mail] ${res.status} ${(await res.text()).slice(0, 300)}`);
    return res.ok;
  } catch (e) {
    console.error("[mail]", e instanceof Error ? e.message : e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** قالب واحد لكل الرسائل، بألوان الهوية. */
export function wrapEmail({ title, body, meta, cta, url }: { title: string; body?: string | null; meta?: string; cta: string; url: string }) {
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f2ede2;font-family:Tahoma,Arial,sans-serif;color:#17130e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fbf8f2;border:1.5px solid #17130e">
<tr><td style="padding:20px 24px;border-bottom:1.5px solid #17130e;font-size:22px;font-weight:bold">ألف <span style="color:#d7331a;letter-spacing:3px">◆◆◆</span></td></tr>
<tr><td style="padding:24px">
${meta ? `<p style="margin:0 0 6px;font-size:13px;color:#6a6256">${esc(meta)}</p>` : ""}
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.4">${esc(title)}</h1>
${body ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.8;white-space:pre-line">${esc(body)}</p>` : ""}
<a href="${esc(url)}" style="display:inline-block;background:#d7331a;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:3px">${esc(cta)}</a>
</td></tr></table>
<p style="margin:14px 0 0;font-size:12px;color:#6a6256">وصلتك هذي الرسالة لأن عندك حساب في ألف.</p>
</td></tr></table></body></html>`;
}
