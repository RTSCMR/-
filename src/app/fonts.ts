import localFont from "next/font/local";

// الخطوط محلية (من @fontsource) عبر next/font: تحميل مسبق تلقائي وبدون طلبات خارجية.
// البديل المعدّل المقاسات (adjustFontFallback) مقفل: مبني على حروف لاتينية وزاد إزاحة التخطيط مع العربي.
// الملف اللاتيني يجي أول في الترتيب لأنه ما فيه حروف عربية، فالمتصفح يكمّل للملف العربي.

export const lalezarLatin = localFont({
  src: "../../node_modules/@fontsource/lalezar/files/lalezar-latin-400-normal.woff2", weight: "400", display: "swap",
  variable: "--f-display-lat", adjustFontFallback: false, fallback: [],
});
export const lalezarArabic = localFont({
  src: "../../node_modules/@fontsource/lalezar/files/lalezar-arabic-400-normal.woff2", weight: "400", display: "swap",
  variable: "--f-display-ar", adjustFontFallback: false,
});
export const plexLatin = localFont({
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-600-normal.woff2", weight: "600" },
  ],
  display: "swap", variable: "--f-sans-lat", adjustFontFallback: false, fallback: [], preload: false,
});
export const plexArabic = localFont({
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2", weight: "600" },
  ],
  display: "swap", variable: "--f-sans-ar", adjustFontFallback: false,
});

export const fontVars = [lalezarLatin, lalezarArabic, plexLatin, plexArabic].map((f) => f.variable).join(" ");
