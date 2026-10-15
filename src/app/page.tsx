import { HomeClient } from "@/components/HomeClient";
import { getWhatsAppNumber } from "@/lib/env";

export default function HomePage() {
  return <HomeClient whatsappNumber={getWhatsAppNumber()} />;
}
