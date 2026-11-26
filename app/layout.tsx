import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Deals | Find More. Pay Less.",
  description: "اكتشف أفضل العروض والتخفيضات وأكواد الخصم في السعودية.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
