import type { Attribution } from "@/types";

export function parseAttributionFromSearch(
  search: string,
  referrer?: string | null
): Attribution {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return {
    source: params.get("source") || params.get("utm_source") || null,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    referrer: referrer || null,
  };
}

export function readClientAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  return parseAttributionFromSearch(
    window.location.search,
    document.referrer || null
  );
}
