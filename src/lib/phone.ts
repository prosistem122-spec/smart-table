/**
 * Normalização de telefones com foco em Moçambique (+258)
 * e formatos internacionais comuns.
 */

export interface PhoneNormalizeResult {
  ok: boolean;
  e164: string | null;
  raw: string;
  error?: string;
}

function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Aceita:
 * - +258 84/85/86/87 XXXXXXX
 * - 25884...
 * - 84/85/86/87 XXXXXXX (assume MZ)
 * - outros internacionais com + e 8–15 dígitos
 */
export function normalizePhone(input: string): PhoneNormalizeResult {
  const raw = (input || "").trim();
  if (!raw) {
    return { ok: false, e164: null, raw, error: "Telefone obrigatório" };
  }

  const hasPlus = raw.includes("+");
  let digits = digitsOnly(raw);

  if (!digits) {
    return { ok: false, e164: null, raw, error: "Número inválido" };
  }

  // Moçambique: local 9 dígitos começando por 8
  if (!hasPlus && digits.length === 9 && /^8[4-7]\d{7}$/.test(digits)) {
    digits = `258${digits}`;
  }

  // Prefixo 00 internacional
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // MZ sem + mas com 258
  if (!hasPlus && digits.startsWith("258") && digits.length === 12) {
    // ok
  }

  if (digits.length < 8 || digits.length > 15) {
    return {
      ok: false,
      e164: null,
      raw,
      error: "Use um número válido (ex: +258 84 123 4567)",
    };
  }

  // Validação específica MZ
  if (digits.startsWith("258")) {
    const national = digits.slice(3);
    if (!/^8[4-7]\d{7}$/.test(national)) {
      return {
        ok: false,
        e164: null,
        raw,
        error: "Número de Moçambique inválido (use 84, 85, 86 ou 87)",
      };
    }
  }

  return { ok: true, e164: `+${digits}`, raw };
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input).ok;
}

export function formatPhoneDisplay(e164: string): string {
  if (!e164) return "";
  if (e164.startsWith("+258") && e164.length === 13) {
    const n = e164.slice(4);
    return `+258 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
  }
  return e164;
}
