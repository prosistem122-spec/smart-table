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
  getTrackingContext,
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
  const [errors, setErrors] = useState<{ name?: string; phone?: string; consent?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    track("landing_view", {
      page: "home",
      element_name: "landing",
      dedupe_key: `landing_${typeof window !== "undefined" ? window.location.pathname : "home"}`,
    });
    track("lead_form_view", {
      page: "lead_form",
      element_name: "lead_identification_form",
      dedupe_key: "lead_form_view_once",
    });
    setupUnloadFlush();
    return startInactivityWatcher(
      Number(process.env.NEXT_PUBLIC_INACTIVE_AFTER_MS) || 15 * 60 * 1000
    );
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const nextErrors: typeof errors = {};

    if (!restaurantName.trim() || restaurantName.trim().length < 2) {
      nextErrors.name = "Indica o nome do restaurante";
    }
    const phoneResult = normalizePhone(phone);
    if (!phoneResult.ok) {
      nextErrors.phone = phoneResult.error || "Telefone inválido";
    }
    if (!consentContact) {
      nextErrors.consent = "Precisas de aceitar o contacto para avançar.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const attribution = readClientAttribution();
      const result = await startSession({
        restaurant_name: restaurantName.trim(),
        phone: phone.trim(),
        consent_analytics: consentAnalytics,
        consent_contact: consentContact,
        attribution,
      });

      track("lead_form_submitted", {
        page: "lead_form",
        element_name: "cta_start_analysis",
        action: "submit",
        value: restaurantName.trim(),
      });

      if (result.resumed) {
        track("session_resumed", {
          page: "lead_form",
          element_name: "session",
          action: "resume",
        });
      }

      track("funnel_started", {
        page: "funnel",
        step_id: "hero_intro",
        step_index: 0,
        element_name: "funnel",
        action: "start",
      });

      onStarted({
        restaurantName: restaurantName.trim(),
        phone: phoneResult.e164 || phone.trim(),
      });
    } catch (err) {
      // Funil pode continuar localmente se a API falhar — mas sem IDs de sessão
      const msg = err instanceof Error ? err.message : "Erro ao iniciar";
      setSubmitError(msg);
      // Se já houver contexto (retry), avançar
      if (getTrackingContext()) {
        onStarted({
          restaurantName: restaurantName.trim(),
          phone: phoneResult.e164 || phone.trim(),
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="enter" noValidate>
      <div className="kicker">Análise gratuita</div>
      <h1>Vamos analisar o potencial do teu restaurante</h1>
      <p className="sub">
        Indica o nome e o contacto do restaurante para começarmos. Os teus dados
        servem para personalizar a análise e para a equipa Smart Table te
        contactar, se autorizares.
      </p>

      <div className="field">
        <label>
          Nome do restaurante <span className="req-tag">obrigatório</span>
        </label>
        <div className="field-wrap">
          <input
            type="text"
            name="restaurant_name"
            data-track="input_restaurant_name"
            placeholder="Ex: Sabores da Baixa"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            style={{
              paddingLeft: 15,
              borderColor: errors.name ? "#C2492E" : undefined,
            }}
            autoComplete="organization"
          />
        </div>
        {errors.name && <p className="note" style={{ color: "#C2492E", textAlign: "left" }}>{errors.name}</p>}
      </div>

      <div className="field">
        <label>
          Telefone ou WhatsApp <span className="req-tag">obrigatório</span>
        </label>
        <div className="field-wrap">
          <input
            type="tel"
            name="phone"
            data-track="input_phone"
            placeholder="+258 84 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              paddingLeft: 15,
              borderColor: errors.phone ? "#C2492E" : undefined,
            }}
            autoComplete="tel"
          />
        </div>
        {errors.phone && <p className="note" style={{ color: "#C2492E", textAlign: "left" }}>{errors.phone}</p>}
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
            Autorizo a Smart Table a guardar o meu nome e telefone para me
            contactar sobre esta análise.
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
        {errors.consent && (
          <p className="note" style={{ color: "#C2492E", textAlign: "left" }}>
            {errors.consent}
          </p>
        )}
        <p className="note" style={{ textAlign: "left", marginTop: 8 }}>
          Consulta a nossa{" "}
          <Link href="/privacidade" style={{ color: "var(--blue)", fontWeight: 600 }}>
            política de privacidade
          </Link>
          .
        </p>
      </div>

      {submitError && (
        <p className="note" style={{ color: "#C2492E" }}>
          {submitError}
        </p>
      )}

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
