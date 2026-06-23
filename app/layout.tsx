import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BRAND_NAME } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: `Course Portal — ${BRAND_NAME}`,
  description: "Watch the course. Skip the guesswork.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="text-textPrimary antialiased">{children}</body>
    </html>
  );
}
