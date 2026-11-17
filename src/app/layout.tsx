import type { Metadata, Viewport } from "next";
import { fontVars } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "ألف — ادفع على كل ألف مشاهدة", template: "%s — ألف" },
  description: "سوق سعودي يربط المتاجر الصغيرة بصنّاع المحتوى. المحاسبة على كل ألف مشاهدة معتمدة.",
};

export const viewport: Viewport = { themeColor: "#f2ede2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={fontVars}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
