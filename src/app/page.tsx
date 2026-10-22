import fs from "fs";
import path from "path";
import { SalesPageClient } from "@/components/sales/SalesPageClient";
import { getWhatsAppNumber } from "@/lib/env";

export const metadata = {
  title: "Smarttable — Menu inteligente com garçom virtual para restaurantes",
  description:
    "Smarttable: a nova era dos restaurantes. Menu inteligente por QR Code com garçom virtual que aumenta o faturamento, reduz custos operacionais e oferece uma experiência inovadora. Acesso grátis, sem compromisso.",
};

export default function HomePage() {
  const html = fs.readFileSync(
    path.join(process.cwd(), "src/components/sales/sales-body.html"),
    "utf8"
  );

  return (
    <SalesPageClient html={html} whatsappNumber={getWhatsAppNumber()} />
  );
}
