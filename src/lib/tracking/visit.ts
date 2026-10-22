const VISIT_KEY = "st_visit_id";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Identificador anónimo estável da visita (localStorage). Sem PII. */
export function getOrCreateVisitId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISIT_KEY);
    if (!id) {
      id = uid();
      localStorage.setItem(VISIT_KEY, id);
    }
    return id;
  } catch {
    return uid();
  }
}

export function getVisitId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(VISIT_KEY);
  } catch {
    return null;
  }
}
