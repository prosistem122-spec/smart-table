"use client";

import { useEffect, useRef } from "react";
import {
  track,
  setupUnloadFlush,
  startInactivityWatcher,
} from "@/lib/tracking/client";
import { getOrCreateVisitId } from "@/lib/tracking/visit";
import { recordPageVisit } from "@/lib/tracking/visit-api";
import { initSalesLanding } from "@/components/sales/initSalesLanding";
import "@/styles/sales.css";

interface Props {
  html: string;
  whatsappNumber: string;
}

const SCROLL_MILESTONES = [25, 50, 75, 100] as const;

export function SalesPageClient({ html, whatsappNumber }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(new Set<number>());
  const sectionsSeen = useRef(new Set<string>());

  useEffect(() => {
    const visitId = getOrCreateVisitId();
    void recordPageVisit("landing");

    track("landing_view", {
      page: "sales",
      element_name: "sales_landing",
      metadata: { visit_id: visitId },
      dedupe_key: `landing_sales_${visitId}`,
    });

    setupUnloadFlush();
    const stopInactivity = startInactivityWatcher(
      Number(process.env.NEXT_PUBLIC_INACTIVE_AFTER_MS) || 15 * 60 * 1000
    );

    const cleanupInit = initSalesLanding({
      whatsappNumber,
      onCtaClick: (element) => {
        track("cta_clicked", {
          page: "sales",
          element_name: element,
          action: "start_free",
          next_page: "/analise",
          metadata: { visit_id: visitId },
        });
        track("button_click", {
          page: "sales",
          element_name: element,
          action: "navigate_analise",
          next_page: "/analise",
          metadata: { visit_id: visitId },
        });
      },
      onDemoStep: (step, manual) => {
        track("demo_step_view", {
          page: "sales",
          step_id: `demo_step_${step}`,
          step_index: step - 1,
          element_name: "product_demo",
          action: manual ? "manual" : "auto",
          value: String(step),
          metadata: { visit_id: visitId },
          dedupe_key: manual
            ? undefined
            : `demo_auto_${visitId}_${step}`,
        });
      },
      onWhatsAppClick: (element) => {
        track("whatsapp_click", {
          page: "sales",
          element_name: element,
          action: "open_whatsapp",
          metadata: { visit_id: visitId },
        });
      },
      onFormRedirect: () => {
        track("cta_clicked", {
          page: "sales",
          element_name: "form_comecar_gratis",
          action: "redirect_analise",
          next_page: "/analise",
          metadata: { visit_id: visitId },
        });
      },
    });

    const sectionIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id =
            (entry.target as HTMLElement).dataset.section ||
            entry.target.id;
          if (!id || sectionsSeen.current.has(id)) return;
          sectionsSeen.current.add(id);
          track("section_view", {
            page: "sales",
            element_name: id,
            action: "view",
            metadata: { visit_id: visitId },
            dedupe_key: `section_${visitId}_${id}`,
          });
        });
      },
      { threshold: 0.35 }
    );

    document
      .querySelectorAll<HTMLElement>("[data-section]")
      .forEach((el) => sectionIo.observe(el));

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      for (const m of SCROLL_MILESTONES) {
        if (pct >= m && !scrolled.current.has(m)) {
          scrolled.current.add(m);
          track("scroll_depth", {
            page: "sales",
            element_name: "sales_page",
            action: "scroll",
            value: String(m),
            metadata: { visit_id: visitId, depth_pct: m },
            dedupe_key: `scroll_${visitId}_${m}`,
          });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      cleanupInit();
      stopInactivity();
      sectionIo.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [whatsappNumber]);

  return (
    <div
      ref={rootRef}
      className="sales-landing"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
