/* eslint-disable @next/next/no-img-element -- O pixel noscript exige uma imagem de rastreamento simples. */
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { MetaPixelNavigation } from "@/components/MetaPixelNavigation";
import { Suspense } from "react";
import { META_PIXEL_BASE } from "@/lib/tracking/meta-pixel-base";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-sales",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Table — Menu inteligente para restaurantes",
  description:
    "Menu inteligente por QR Code com garçom virtual. Análise gratuita do potencial do teu restaurante.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-MZ" className={plusJakarta.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: META_PIXEL_BASE }} />
        <noscript><img height="1" width="1" style={{ display: "none" }} src="https://www.facebook.com/tr?id=1115803051092289&ev=PageView&noscript=1" alt="" /></noscript>
      </head>
      <body className={plusJakarta.className}><Suspense fallback={null}><MetaPixelNavigation /></Suspense>{children}</body>
    </html>
  );
}
