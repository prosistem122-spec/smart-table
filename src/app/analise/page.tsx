import { HomeClient } from "@/components/HomeClient";
import { getWhatsAppNumber } from "@/lib/env";

export const metadata = {
  title: "Análise gratuita — Smart Table",
  description:
    "Identifica o teu restaurante e inicia a análise gratuita Smart Table.",
};

interface Props {
  searchParams: Promise<{ restaurante?: string; telefone?: string }>;
}

export default async function AnalisePage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <HomeClient
      whatsappNumber={getWhatsAppNumber()}
      initialRestaurantName={params.restaurante?.slice(0, 120) || ""}
      initialPhone={params.telefone?.slice(0, 40) || ""}
    />
  );
}
