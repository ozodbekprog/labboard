import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LabBoard — interaktiv laboratoriya platformasi",
  description:
    "Universitetlar uchun jonli dars platformasi: cheksiz doska, simulyatsiyalar (fizika, kimyo, matematika, tarix, coding), video darslar, jadval va AI yordamchi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex flex-col min-h-full bg-[#f7f8fa] text-slate-900 font-sans">{children}</body>
    </html>
  );
}
