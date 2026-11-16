import type { Metadata, Viewport } from "next";
import "@fontsource/lalezar/400.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ألف — ادفع على كل ألف مشاهدة", template: "%s — ألف" },
  description: "سوق سعودي يربط المتاجر الصغيرة بصنّاع المحتوى. المحاسبة على كل ألف مشاهدة معتمدة.",
};

export const viewport: Viewport = { themeColor: "#f2ede2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
