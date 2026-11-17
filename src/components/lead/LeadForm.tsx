"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { normalizePhone } from "@/lib/phone";
import { readClientAttribution } from "@/lib/attribution";
import {
  startSession,
  track,
  setupUnloadFlush,
  startInactivityWatcher,
} from "@/lib/tracking/client";

interface Props {
  onStarted: (info: { restaurantName: string; phone: string }) => void;
  initialRestaurantName?: string;
  initialPhone?: string;
}

export function LeadForm({
  onStarted,
  initialRestaurantName = "",
  initialPhone = "",
}: Props) {
  const [restaurantName, setRestaurantName] = useState(initialRestaurantName);
  const [phone, setPhone] = useState(initialPhone);
  const [consentAnalytics, setConsentAnalytics] = useState(true);
  const [consentContact, setConsentContact] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    track("lead_form_view", {
      page: "lead_form",
      element_name: "lead_identification_form",
      previous_page: "sales",
      dedupe_key: "lead_form_view_once",
    });
    setupUnloadFlush();
    return startInactivityWatcher(
      Number(process.env.NEXT_PUBLIC_INACTIVE_AFTER_MS) || 15 * 60 * 1000
    );
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = restaurantName.trim();
    const trimmedPhone = phone.trim();
    const phoneResult = trimmedPhone ? normalizePhone(trimmedPhone) : null;

    setSubmitting(true);
    try {
      if (phoneResult?.ok && (consentContact || consentAnalytics)) {
        const attribution = readClientAttribution();
        const result = await startSession({
          restaurant_name: trimmedName || "Restaurante",
          phone: trimmedPhone,
          consent_analytics: consentAnalytics,
          consent_contact: consentContact,
          attribution,
        });

        track("lead_form_submitted", {
          page: "lead_form",
          element_name: "cta_start_analysis",
          action: "submit",
          value: trimmedName,
        });

        if (result.resumed) {
          track("session_resumed", {
            page: "lead_form",
            element_name: "session",
            action: "resume",
          });
        }
      }

      track("funnel_started", {
        page: "funnel",
        step_id: "hero_intro",
        step_index: 0,
        element_name: "funnel",
        action: "start",
      });
    } catch {
      /* O funil avança mesmo sem sessão remota. */
    } finally {
      setSubmitting(false);
    }

    onStarted({
      restaurantName: trimmedName,
      phone: phoneResult?.e164 || trimmedPhone,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="enter" noValidate>
      <div className="kicker">Análise gratuita</div>
      <h1>Vamos analisar o potencial do teu restaurante</h1>
      <p className="sub">
        Podes indicar o nome e o contacto do restaurante para personalizar a
        análise (opcional).
      </p>

      <div className="field">
        <label>
          Nome do restaurante <span className="opt-tag">opcional</span>
        </label>
        <div className="field-wrap">
          <input
            type="text"
            name="restaurant_name"
            data-track="input_restaurant_name"
            placeholder="Ex: Sabores da Baixa"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            style={{ paddingLeft: 15 }}
            autoComplete="organization"
          />
        </div>
      </div>

      <div className="field">
        <label>
          Telefone ou WhatsApp <span className="opt-tag">opcional</span>
        </label>
        <div className="field-wrap">
          <input
            type="tel"
            name="phone"
            data-track="input_phone"
            placeholder="+258 84 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ paddingLeft: 15 }}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="consent-box">
        <label className="consent-row">
          <input
            type="checkbox"
            checked={consentContact}
            onChange={(e) => setConsentContact(e.target.checked)}
            data-track="consent_contact"
          />
          <span>
            Autorizo a Smart Table a guardar os dados fornecidos para me
            contactar sobre esta análise (opcional).
          </span>
        </label>
        <label className="consent-row">
          <input
            type="checkbox"
            checked={consentAnalytics}
            onChange={(e) => setConsentAnalytics(e.target.checked)}
            data-track="consent_analytics"
          />
          <span>
            Autorizo o registo anónimo do meu percurso no funil para melhorar o
            serviço (sem impressões digitais do dispositivo).
          </span>
        </label>
        <p className="note" style={{ textAlign: "left", marginTop: 8 }}>
          Consulta a nossa{" "}
          <Link href="/privacidade" style={{ color: "var(--blue)", fontWeight: 600 }}>
            política de privacidade
          </Link>
          .
        </p>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        data-track="cta_start_analysis"
        disabled={submitting}
      >
        {submitting ? "A iniciar…" : "Analisar o meu restaurante"}
      </button>
    </form>
  );
}
