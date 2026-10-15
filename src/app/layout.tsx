import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Table — Análise gratuita",
  description:
    "Analisa o potencial do teu restaurante e descobre como a Smart Table pode elevar o faturamento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-MZ">
      <body>{children}</body>
    </html>
  );
}
