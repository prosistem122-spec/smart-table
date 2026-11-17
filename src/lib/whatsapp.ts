export const WHATSAPP_NUMBER = "258853003836";

const LEGACY_PLACEHOLDER_NUMBERS = new Set(["258840000000"]);

/** Devolve o número de WhatsApp em formato internacional apenas com dígitos (para wa.me). */
export function normalizeWhatsAppNumber(value?: string | null): string {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits || LEGACY_PLACEHOLDER_NUMBERS.has(digits)) {
    return WHATSAPP_NUMBER;
  }
  return digits;
}

export function buildWhatsAppUrl(
  message: string,
  whatsappNumber: string = WHATSAPP_NUMBER
): string {
  const wa = normalizeWhatsAppNumber(whatsappNumber);
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}

export interface LandingFormFields {
  name?: string;
  restaurant?: string;
  whatsapp?: string;
  tables?: string;
}

/** Mensagem pré-preenchida com os dados introduzidos pelo visitante na Landing Page. */
export function buildLandingWhatsAppMessage(fields: LandingFormFields): string {
  const lines = ["Olá! Quero começar grátis com a Smarttable."];
  const name = (fields.name || "").trim();
  const restaurant = (fields.restaurant || "").trim();
  const whatsapp = (fields.whatsapp || "").trim();
  const tables = (fields.tables || "").trim();

  if (name) lines.push(`Nome: ${name}`);
  if (restaurant) lines.push(`Restaurante: ${restaurant}`);
  if (whatsapp) lines.push(`WhatsApp: ${whatsapp}`);
  if (tables) lines.push(`Mesas: ${tables}`);

  return lines.join("\n");
}

/** Mensagem pré-preenchida com as respostas do funil. */
export function buildFunnelWhatsAppMessage(
  values: Record<string, string | undefined>
): string {
  const lines = ["Olá! Vim do funil da Smart Table."];
  const add = (label: string, val?: string) => {
    const clean = (val || "").trim();
    if (clean) lines.push(`${label}: ${clean}`);
  };

  add("Restaurante", values.nome);
  add("Tipo", values.tipo);
  add("Localização", values.local);
  add("Contacto do restaurante", values.contactoEmpresa);
  add("Faturação mensal", values.faturacao);
  add("Mesas", values.mesas);
  add("Situação atual", values.estado);
  add("Objetivo", values.solucao);

  const resp = (values.resp_nome || "").trim();
  const cargo = (values.cargo || "").trim();
  if (resp && cargo) lines.push(`Contacto: ${resp} (${cargo})`);
  else if (resp) lines.push(`Contacto: ${resp}`);
  else if (cargo) lines.push(`Cargo: ${cargo}`);

  const whatsapp = (values.whatsapp || "").trim();
  const telefone = (values.telefone || "").trim();
  add("WhatsApp", whatsapp);
  if (telefone && telefone !== whatsapp) {
    add("Telefone", telefone);
  }
  add("Email", values.email);

  return lines.join("\n");
}
