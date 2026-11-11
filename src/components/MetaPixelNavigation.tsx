"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** O snippet no head conta o carregamento inicial; aqui contamos só mudanças reais de rota. */
export function MetaPixelNavigation() {
  const path = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current !== null && previous.current !== path && (path === "/" || path === "/analise")) {
      window.fbq?.("track", "PageView");
    }
    previous.current = path;
  }, [path]);
  return null;
}
