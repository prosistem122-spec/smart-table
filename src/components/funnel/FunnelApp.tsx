"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CALC_BASE,
  CONTACT_FIELDS,
  STAGE_GROUPS,
  STEPS,
  coversForMesas,
  fmtN,
} from "./steps";
import { VslPlayer } from "./VslPlayer";
import { track, saveAnswers } from "@/lib/tracking/client";
import {
  DEFAULT_VIDEO_SETTINGS,
  type FunnelVideoSettings,
  type VideoSlot,
} from "@/lib/video/settings";

interface Props {
  seedRestaurantName?: string;
  seedPhone?: string;
  whatsappNumber: string;
}

type Answers = Record<string, string>;

function slotForStep(stepId: string): VideoSlot | null {
  if (stepId === "hero_intro" || stepId === "hero_social_proof") {
    return stepId;
  }
  return null;
}

export function FunnelApp({
  seedRestaurantName = "",
  seedPhone = "",
  whatsappNumber,
}: Props) {
  const [cur, setCur] = useState(0);
  const [ans, setAns] = useState<Answers>(() => ({
    ...(seedRestaurantName ? { nome: seedRestaurantName } : {}),
    ...(seedPhone ? { whatsapp: seedPhone, telefone: seedPhone } : {}),
  }));
  const [quizSel, setQuizSel] = useState<Record<number, string>>({});
  const [contactExpanded, setContactExpanded] = useState(false);
  const [resultPhase, setResultPhase] = useState<1 | 2>(1);
  const [calcPct, setCalcPct] = useState(15);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState(false);
  const [contactDraft, setContactDraft] = useState<Answers>({});
  const [contactErrors, setContactErrors] = useState<Record<string, boolean>>({});
  const [counter, setCounter] = useState(0);
  const [videoBySlot, setVideoBySlot] = useState<
    Record<VideoSlot, FunnelVideoSettings>
  >(DEFAULT_VIDEO_SETTINGS);
  const stepEnteredAt = useRef(Date.now());
  const viewedSteps = useRef(new Set<number>());
  const calcTracked = useRef(false);

  const step = STEPS[cur];
  const stepId = step.id;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/public/video-settings");
        if (!res.ok) return;
        const json = (await res.json()) as {
          settings?: FunnelVideoSettings[];
        };
        if (cancelled || !json.settings?.length) return;
        setVideoBySlot((prev) => {
          const next = { ...prev };
          for (const s of json.settings!) {
            if (s.slot === "hero_intro" || s.slot === "hero_social_proof") {
              next[s.slot] = s;
            }
          }
          return next;
        });
      } catch {
        /* sem vídeo configurado — placeholder */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nomeTxt = useMemo(
    () => (ans.nome?.trim() ? ans.nome.trim() : "o teu restaurante"),
    [ans.nome]
  );

  const fill = useCallback(
    (s: string) => s.replace(/\{nome\}/g, nomeTxt),
    [nomeTxt]
  );

  const durationMs = () => Math.max(0, Date.now() - stepEnteredAt.current);

  const completeCurrent = useCallback(
    (extra?: { element_name?: string; action?: string; value?: string }) => {
      track("step_completed", {
        page: "funnel",
        step_id: stepId,
        step_index: cur,
        element_name: extra?.element_name || "step",
        action: extra?.action || "complete",
        value: extra?.value,
        duration_ms: durationMs(),
      });
    },
    [cur, stepId]
  );

  const go = useCallback(
    (i: number) => {
      if (i < 0 || i >= STEPS.length) return;
      const prev = STEPS[cur];
      const next = STEPS[i];
      const dwell = durationMs();
      track("page_dwell", {
        page: "funnel",
        step_id: prev.id,
        step_index: cur,
        element_name: "step_leave",
        action: i < cur ? "back" : "forward",
        duration_ms: dwell,
      });
      if (i < cur) {
        track("step_back", {
          page: "funnel",
          step_id: prev.id,
          step_index: cur,
          previous_page: prev.id,
          next_page: next.id,
          element_name: "btn_step_back",
          action: "back",
          duration_ms: dwell,
        });
      }
      if (next.type === "contact") setContactExpanded(false);
      if (next.type === "result") setResultPhase(1);
      if (next.type === "input") {
        setInputValue(ans[next.key || ""] || "");
        setInputError(false);
      }
      if (next.type === "contact") {
        setContactDraft((d) => ({
          ...d,
          resp_nome: ans.resp_nome || d.resp_nome || "",
          whatsapp: ans.whatsapp || d.whatsapp || seedPhone || "",
          telefone: ans.telefone || d.telefone || "",
          cargo: ans.cargo || d.cargo || "",
          email: ans.email || d.email || "",
          contactoEmpresa: ans.contactoEmpresa || d.contactoEmpresa || "",
        }));
      }
      stepEnteredAt.current = Date.now();
      setCur(i);
    },
    [ans, cur, seedPhone]
  );

  useEffect(() => {
    if (viewedSteps.current.has(cur)) return;
    viewedSteps.current.add(cur);
    track("step_view", {
      page: "funnel",
      step_id: stepId,
      step_index: cur,
      element_name: `step_${stepId}`,
      action: "view",
      dedupe_key: `step_view_${stepId}`,
    });
    if (step.type === "result") {
      track("section_view", {
        page: "funnel",
        step_id: stepId,
        step_index: cur,
        element_name: "result_section",
      });
    }
    if (step.type === "calc") {
      track("section_view", {
        page: "funnel",
        step_id: stepId,
        element_name: "calculator_section",
      });
    }
  }, [cur, step.type, stepId]);

  useEffect(() => {
    if (step.type !== "result" || resultPhase !== 1) return;
    const t = setTimeout(() => setResultPhase(2), 2050);
    return () => clearTimeout(t);
  }, [step.type, resultPhase, cur]);

  useEffect(() => {
    if (step.type !== "result" || resultPhase !== 2) return;
    track("result_viewed", {
      page: "funnel",
      step_id: stepId,
      step_index: cur,
      element_name: "result_reveal",
      dedupe_key: `result_viewed_${stepId}`,
    });
    setCounter(0);
    const target = 22;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setCounter(Math.round(p * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step.type, resultPhase, cur, stepId]);

  function waLink() {
    const t = `Olá! Vim do funil da Smart Table.\nRestaurante: ${ans.nome || "-"}\nTipo: ${ans.tipo || "-"}\nLocalização: ${ans.local || "-"}\nContacto do restaurante: ${ans.contactoEmpresa || "-"}\nFaturação mensal: ${ans.faturacao || "-"}\nMesas: ${ans.mesas || "-"}\nObjetivo: ${ans.solucao || "-"}\nContacto: ${ans.resp_nome || "-"} (${ans.cargo || "-"})\nWhatsApp: ${ans.whatsapp || "-"}\nTelefone: ${ans.telefone || "-"}`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t)}`;
  }

  function pick(key: string, val: string) {
    setAns((a) => ({ ...a, [key]: val }));
    track("answer_selected", {
      page: "funnel",
      step_id: stepId,
      step_index: cur,
      element_name: `answer_${key}`,
      action: "select",
      value: val,
    });
    void saveAnswers([{ question_key: key, answer: val, step_id: stepId }]);
    completeCurrent({ element_name: `answer_${key}`, value: val });
    setTimeout(() => go(cur + 1), 320);
  }

  function quizPick(val: string) {
    setQuizSel((q) => ({ ...q, [cur]: val }));
    track("answer_selected", {
      page: "funnel",
      step_id: stepId,
      step_index: cur,
      element_name: `quiz_${stepId}`,
      action: "select",
      value: val,
    });
    void saveAnswers([
      { question_key: `quiz_${stepId}`, answer: val, step_id: stepId },
    ]);
  }

  function submitInput(key: string) {
    const v = inputValue.trim();
    if (!v) {
      setInputError(true);
      return;
    }
    setAns((a) => ({ ...a, [key]: v }));
    track("button_click", {
      page: "funnel",
      step_id: stepId,
      element_name: "btn_step_continue",
      action: "continue",
      value: v,
    });
    void saveAnswers([{ question_key: key, answer: v, step_id: stepId }]);
    completeCurrent({ element_name: "btn_step_continue", value: v });
    go(cur + 1);
  }

  function submitContact(final: boolean) {
    const nextAns = { ...ans };
    const errs: Record<string, boolean> = {};
    let ok = true;
    CONTACT_FIELDS.forEach((f) => {
      const v = (contactDraft[f.key] || "").trim();
      nextAns[f.key] = v;
      const isOptional = final ? f.key === "contactoEmpresa" : !!f.optional;
      if (!isOptional && !v) {
        errs[f.key] = true;
        ok = false;
      }
    });
    setContactErrors(errs);
    if (!ok) return;
    if (!nextAns.telefone && nextAns.whatsapp) nextAns.telefone = nextAns.whatsapp;
    setAns(nextAns);

    const answers = CONTACT_FIELDS.filter((f) => nextAns[f.key]).map((f) => ({
      question_key: f.key,
      answer: nextAns[f.key],
      step_id: stepId,
    }));
    void saveAnswers(answers);

    track("button_click", {
      page: "funnel",
      step_id: stepId,
      element_name: final ? "cta_final_contact" : "btn_contact_continue",
      action: "submit_contact",
    });

    if (final) {
      track("contact_requested", {
        page: "funnel",
        step_id: stepId,
        element_name: "cta_final_contact",
        action: "contact_requested",
      });
      track("funnel_completed", {
        page: "funnel",
        step_id: stepId,
        step_index: cur,
        element_name: "funnel",
        action: "complete",
      });
      track("cta_clicked", {
        page: "funnel",
        step_id: stepId,
        element_name: "cta_final_contact",
        action: "cta",
      });
    }

    completeCurrent({
      element_name: final ? "cta_final_contact" : "btn_contact_continue",
    });
    go(cur + 1);
    if (final) {
      setTimeout(() => {
        track("whatsapp_click", {
          page: "funnel",
          step_id: "thanks_whatsapp",
          element_name: "cta_whatsapp_auto",
          action: "open",
        });
        window.open(waLink(), "_blank");
      }, 250);
    }
  }

  function onPrimaryCta(label: string, elementName: string) {
    track("cta_clicked", {
      page: "funnel",
      step_id: stepId,
      step_index: cur,
      element_name: elementName,
      action: "cta",
      value: label,
    });
    track("button_click", {
      page: "funnel",
      step_id: stepId,
      element_name: elementName,
      action: "click",
      value: label,
    });
    completeCurrent({ element_name: elementName });
    go(cur + 1);
  }

  function onCalcChange(v: number) {
    setCalcPct(v);
    if (!calcTracked.current) {
      calcTracked.current = true;
      track("calculator_used", {
        page: "funnel",
        step_id: stepId,
        element_name: "calc_ticket_slider",
        action: "adjust",
        value: String(v),
      });
    }
  }

  const covers = coversForMesas(ans.mesas);
  const dailyBase = CALC_BASE * covers;
  const newTicket = Math.round(CALC_BASE * (1 + calcPct / 100));
  const extraMonth = (newTicket * covers - dailyBase) * 30;

  function renderProgress() {
    if (step.type === "thanks" || step.video) return null;
    const total = STEPS.length - 1;
    const pct = Math.min(100, Math.round((cur / total) * 100));
    return (
      <>
        <div className="ticketrow">
          <span>
            Passo {Math.min(cur + 1, total)} de {total}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="stages">
          {STAGE_GROUPS.map((st, idx) => {
            const nodes = [];
            if (idx > 0) {
              const prev = STAGE_GROUPS[idx - 1];
              const f =
                cur >= prev.upTo
                  ? 1
                  : cur <= prev.from
                    ? 0
                    : (cur - prev.from) / (prev.upTo - prev.from);
              nodes.push(
                <div className="stage-line" key={`line-${idx}`}>
                  <div
                    className="stage-line-fill"
                    style={{ width: `${Math.round(f * 100)}%` }}
                  />
                </div>
              );
            }
            const cls = ["stage-dot"];
            if (cur > st.upTo) cls.push("done");
            else if (cur >= st.from && cur <= st.upTo) cls.push("current");
            if (idx === STAGE_GROUPS.length - 1) cls.push("gift");
            nodes.push(
              <div className={cls.join(" ")} key={`dot-${idx}`}>
                {st.icon}
              </div>
            );
            return nodes;
          })}
        </div>
      </>
    );
  }

  function buildInsights() {
    const arr: string[] = [];
    if (ans.solucao) {
      arr.push(
        `O teu foco em "${ans.solucao.toLowerCase()}" é exatamente onde a Smart Table tem mais impacto.`
      );
    }
    if (ans.estado === "Mau, estou quase a fechar") {
      arr.push(
        "Identificámos sinais de que pequenas mudanças podem ter um impacto rápido no teu caixa."
      );
    } else if (ans.estado === "Oscila, às vezes é negativo") {
      arr.push(
        "A tua faturação oscila — estabilizar o ticket médio é o primeiro passo para mais previsibilidade."
      );
    } else if (ans.estado) {
      arr.push(
        "Já tens uma base estável — isso significa que o crescimento agora pode ser ainda mais rápido."
      );
    }
    if (ans.mesas) {
      arr.push(
        `Com ${ans.mesas.toLowerCase()}, há espaço real para aumentar o valor de cada pedido sem precisares de mais espaço físico.`
      );
    }
    return arr.slice(0, 3);
  }

  const insights = buildInsights();
  const titleHtml = step.title ? fill(step.title) : "";
  const labelHtml = step.label ? fill(step.label) : "";

  return (
    <div className="enter" key={cur}>
      {renderProgress()}
      {!step.video && cur > 0 && cur < STEPS.length - 1 && (
        <button
          type="button"
          className="btn-ghost"
          data-track="btn_step_back"
          onClick={() => go(cur - 1)}
        >
          ← Voltar
        </button>
      )}
      {step.kicker && !step.video && (
        <div className="kicker">{fill(step.kicker)}</div>
      )}

      {step.type === "hero" && step.video && (
        <>
          <h1 className="h1-big" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          {(() => {
            const slot = slotForStep(stepId);
            const cfg = slot
              ? videoBySlot[slot]
              : DEFAULT_VIDEO_SETTINGS.hero_intro;
            const ctaTrack =
              cur === 0 ? "cta_quero_ferramenta" : "cta_obter_smart_table";
            return (
              <VslPlayer
                videoUrl={cfg.video_url}
                ctaDelaySeconds={cfg.cta_delay_seconds}
                timelineCurve={cfg.timeline_curve}
                stepId={stepId}
                stepIndex={cur}
                ctaLabel={step.cta || ""}
                ctaTrack={ctaTrack}
                onCta={() => onPrimaryCta(step.cta || "", ctaTrack)}
              />
            );
          })()}
        </>
      )}

      {step.type === "hero" && !step.video && (
        <>
          <h1 dangerouslySetInnerHTML={{ __html: titleHtml }} />
          {step.img && <ImgSlot />}
          {step.recap && (
            <div className="recap">
              {ans.tipo && <span className="recap-pill">🍽️ {ans.tipo}</span>}
              {ans.local && <span className="recap-pill">📍 {ans.local}</span>}
              {ans.faturacao && (
                <span className="recap-pill">💰 {ans.faturacao}</span>
              )}
              {ans.mesas && <span className="recap-pill">🪑 {ans.mesas}</span>}
            </div>
          )}
          {step.pillars && (
            <div className="pillars">
              {step.pillars.map((p) => (
                <div className="pillar" key={p.t}>
                  <span className="pic">{p.i}</span>
                  <span>{p.t}</span>
                </div>
              ))}
            </div>
          )}
          {step.sub && <p className="sub">{fill(step.sub)}</p>}
          <button
            type="button"
            className="btn btn-primary"
            data-track={`cta_${stepId}`}
            onClick={() => onPrimaryCta(step.cta || "", `cta_${stepId}`)}
          >
            {step.cta}
          </button>
        </>
      )}

      {step.type === "input" && (
        <>
          <h1>{labelHtml}</h1>
          <div className="field">
            <input
              type={step.itype || "text"}
              placeholder={step.ph}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setInputError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitInput(step.key!);
              }}
              style={{
                paddingLeft: 15,
                borderColor: inputError ? "#C2492E" : undefined,
              }}
              data-track={`input_${step.key}`}
              autoFocus
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            data-track="btn_step_continue"
            onClick={() => submitInput(step.key!)}
          >
            Continuar
          </button>
        </>
      )}

      {(step.type === "choice" || step.type === "chips") && (
        <>
          <h1>{labelHtml}</h1>
          <div className={step.type === "choice" ? "choices" : "chips"}>
            {step.options?.map((o, idx) => {
              const sel = ans[step.key!] === o;
              const ic = step.icons?.[idx];
              if (step.type === "choice") {
                const feat = step.featuredOption === o && !sel;
                return (
                  <button
                    key={o}
                    type="button"
                    className={`choice${sel ? " sel" : ""}${feat ? " feat" : ""}`}
                    data-track={`answer_${step.key}_${idx}`}
                    onClick={() => pick(step.key!, o)}
                  >
                    {ic && <span className="ic">{ic}</span>}
                    <span>{o}</span>
                    <span className="check">✓</span>
                  </button>
                );
              }
              return (
                <button
                  key={o}
                  type="button"
                  className={`chip${sel ? " sel" : ""}`}
                  data-track={`answer_${step.key}_${idx}`}
                  onClick={() => pick(step.key!, o)}
                >
                  {ic && <span className="ic">{ic}</span>}
                  {o}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step.type === "quiz" && (
        <>
          <h1>{fill(step.title || "")}</h1>
          <div className="choices">
            {step.options?.map((o, idx) => {
              const sel = quizSel[cur] === o;
              const feat = step.featuredOption === o && !sel;
              const ic = step.icons?.[idx];
              return (
                <button
                  key={o}
                  type="button"
                  className={`choice${sel ? " sel" : ""}${feat ? " feat" : ""}`}
                  data-track={`quiz_${stepId}_${idx}`}
                  onClick={() => quizPick(o)}
                >
                  {ic && <span className="ic">{ic}</span>}
                  <span>{o}</span>
                </button>
              );
            })}
          </div>
          {quizSel[cur] && (
            <>
              <div className="reveal">
                <span className="tag">💡 Já sabes</span>
                <p>{fill(step.reveal || "")}</p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                data-track="btn_quiz_continue"
                onClick={() => {
                  completeCurrent({ element_name: "btn_quiz_continue" });
                  go(cur + 1);
                }}
              >
                Continuar
              </button>
            </>
          )}
        </>
      )}

      {step.type === "calc" && (
        <>
          <h1>{fill(step.title || "")}</h1>
          <p className="sub">{fill(step.sub || "")}</p>
          <div className="factrow">
            <div className="fact">
              <span className="fic">👥</span>
              <div>
                <strong>{covers}</strong>
                <small>clientes/dia (exemplo)</small>
              </div>
            </div>
            <div className="fact">
              <span className="fic">💵</span>
              <div>
                <strong>{CALC_BASE} MZN</strong>
                <small>ticket médio atual</small>
              </div>
            </div>
          </div>
          <div className="calcline">
            <span>Faturamento diário atual</span>
            <strong>{fmtN(dailyBase)} MZN</strong>
          </div>
          <p className="formula">
            {CALC_BASE} MZN × {covers} clientes/dia
          </p>
          <div className="slider-wrap">
            <div className="slider-label">
              Aumenta o ticket médio <span>+{calcPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={5}
              value={calcPct}
              data-track="calc_ticket_slider"
              onChange={(e) => onCalcChange(Number(e.target.value))}
            />
          </div>
          <div className="calcline">
            <span>Novo ticket médio</span>
            <strong className="hl">{newTicket} MZN</strong>
          </div>
          <p className="formula">
            {newTicket} MZN × {covers} clientes/dia
          </p>
          <div className="calcresult">
            <span>+{fmtN(extraMonth)} MZN</span>
            <span className="calcresult-label">
              a mais por mês, em exemplo, para {nomeTxt}
            </span>
          </div>
          <div className="insight-note">
            💡 Com o mesmo número de clientes, só o aumento do ticket médio já
            faz o faturamento crescer — sem gastares dinheiro a atrair novos
            clientes ou a abrir mais mesas. Basta fazer cada cliente consumir um
            pouco mais.
          </div>
          <p className="note" style={{ margin: "10px 0 18px" }}>
            *Exemplo ilustrativo com base em restaurantes com um número de mesas
            semelhante ao teu.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            data-track="btn_calc_continue"
            onClick={() => {
              void saveAnswers([
                {
                  question_key: "calc_pct",
                  answer: String(calcPct),
                  step_id: stepId,
                },
              ]);
              completeCurrent({ element_name: "btn_calc_continue" });
              go(cur + 1);
            }}
          >
            {step.cta}
          </button>
        </>
      )}

      {step.type === "result" && resultPhase === 1 && (
        <>
          <h1>A analisar o teu negócio...</h1>
          <div className="proc">
            {[
              `A processar os dados de ${nomeTxt}...`,
              "A comparar com restaurantes semelhantes...",
              "A calcular o potencial de crescimento...",
              "A preparar a tua solução...",
            ].map((l, i) => (
              <div
                className="procline"
                key={l}
                style={{ animationDelay: `${0.15 + i * 0.4}s` }}
              >
                <span className="procdot" />
                {l}
              </div>
            ))}
            <div className="procbar">
              <div />
            </div>
          </div>
        </>
      )}

      {step.type === "result" && resultPhase === 2 && (
        <>
          <h1>{step.title}</h1>
          <p className="sub">{fill(step.sub || "")}</p>
          <div className="counter">
            <div className="counter-num">{counter}%</div>
            <div className="counter-label">
              potencial estimado de aumento no ticket médio*
            </div>
          </div>
          <ChartSvg />
          {insights.length > 0 && (
            <ul className="insights">
              {insights.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
          <p className="note" style={{ marginBottom: 16 }}>
            *Estimativa com base em restaurantes semelhantes.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            data-track="cta_obter_solucao"
            onClick={() => onPrimaryCta(step.cta || "", "cta_obter_solucao")}
          >
            {step.cta}
          </button>
        </>
      )}

      {step.type === "contact" && (
        <>
          <h1>{fill(step.title || "")}</h1>
          <p className="sub">{fill(step.sub || "")}</p>
          {step.proof && (
            <div className="proofrow">
              {step.proof.map((p) => (
                <span className="proof" key={p}>
                  {p}
                </span>
              ))}
            </div>
          )}
          {CONTACT_FIELDS.filter((f) => {
            const isOpt = step.final
              ? f.key === "contactoEmpresa"
              : !!f.optional;
            if (!isOpt) return true;
            return step.final || contactExpanded || !!ans[f.key];
          }).map((f) => {
            const isOpt = step.final
              ? f.key === "contactoEmpresa"
              : !!f.optional;
            return (
              <div className="field" key={f.key}>
                <label>
                  {f.label}{" "}
                  {isOpt ? (
                    <span className="opt-tag">opcional</span>
                  ) : (
                    <span className="req-tag">obrigatório</span>
                  )}
                </label>
                <div className="field-wrap">
                  <input
                    type={f.itype}
                    placeholder={f.ph}
                    value={contactDraft[f.key] || ""}
                    data-track={`contact_${f.key}`}
                    onChange={(e) =>
                      setContactDraft((d) => ({ ...d, [f.key]: e.target.value }))
                    }
                    style={{
                      paddingLeft: 15,
                      borderColor: contactErrors[f.key] ? "#C2492E" : undefined,
                    }}
                  />
                </div>
              </div>
            );
          })}
          {!step.final &&
            !contactExpanded &&
            !CONTACT_FIELDS.some((f) => f.optional && ans[f.key]) && (
              <button
                type="button"
                className="addmore"
                data-track="btn_add_contact_details"
                onClick={() => setContactExpanded(true)}
              >
                + Adicionar mais detalhes (opcional)
              </button>
            )}
          <button
            type="button"
            className="btn btn-primary"
            data-track={step.final ? "cta_final_contact" : "btn_contact_continue"}
            onClick={() => submitContact(!!step.final)}
          >
            {step.cta || "Continuar"}
          </button>
          {step.final && (
            <p className="note">
              🔒 Os teus dados servem apenas para a equipa Smart Table entrar em
              contacto contigo.
            </p>
          )}
        </>
      )}

      {step.type === "thanks" && (
        <>
          <svg className="successmark" viewBox="0 0 52 52">
            <circle
              cx="26"
              cy="26"
              r="24"
              fill="none"
              stroke="var(--blue)"
              strokeWidth="2.5"
            />
            <path
              fill="none"
              stroke="var(--blue)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 27l7 7 17-17"
            />
          </svg>
          <h1>{fill(step.title || "")}</h1>
          <p className="sub">{fill(step.sub || "")}</p>
          <div className="reveal">
            <span className="tag">⚡ Queres acelerar?</span>
            <p>
              Não fiques na lista de espera — fala agora diretamente com a nossa
              equipa e ganha prioridade na resposta.
            </p>
          </div>
          <a
            className="btn btn-primary"
            href={waLink()}
            target="_blank"
            rel="noopener noreferrer"
            data-track="cta_whatsapp"
            onClick={() => {
              track("whatsapp_click", {
                page: "funnel",
                step_id: stepId,
                element_name: "cta_whatsapp",
                action: "open",
              });
              track("cta_clicked", {
                page: "funnel",
                step_id: stepId,
                element_name: "cta_whatsapp",
                action: "cta",
              });
            }}
          >
            Falar agora pelo WhatsApp
          </a>
          <p className="note">
            Podes fechar esta janela a qualquer momento — entraremos em contacto
            de qualquer forma.
          </p>
        </>
      )}
    </div>
  );
}

function ImgSlot() {
  return (
    <div className="img-illustration">
      <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="250" rx="20" fill="#EEF1FE" />
        <circle cx="60" cy="40" r="26" fill="#2446EE" opacity="0.08" />
        <circle cx="350" cy="212" r="34" fill="#2446EE" opacity="0.08" />
        <rect x="120" y="55" width="180" height="140" rx="16" fill="#111827" />
        <rect x="134" y="69" width="152" height="112" rx="8" fill="#FFFFFF" />
        <rect x="150" y="140" width="16" height="30" rx="3" fill="#2446EE" opacity="0.35" />
        <rect x="175" y="120" width="16" height="50" rx="3" fill="#2446EE" opacity="0.55" />
        <rect x="200" y="100" width="16" height="70" rx="3" fill="#2446EE" opacity="0.75" />
        <rect x="225" y="80" width="16" height="90" rx="3" fill="#2446EE" />
        <polyline
          points="150,150 175,130 200,108 225,85 250,78"
          fill="none"
          stroke="#2446EE"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="250" cy="78" r="5" fill="#2446EE" />
      </svg>
    </div>
  );
}

function ChartSvg() {
  return (
    <svg className="chart" viewBox="0 0 380 150" xmlns="http://www.w3.org/2000/svg">
      <polyline
        points="10,120 100,96 190,100 280,46 370,30"
        fill="none"
        stroke="var(--blue)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="370" cy="30" r="5.5" fill="var(--blue)" />
      <text x="10" y="140" fontSize="11" fill="var(--muted)" fontFamily="inherit">
        Antes
      </text>
      <text x="340" y="22" fontSize="11" fill="var(--muted)" fontFamily="inherit">
        Depois
      </text>
    </svg>
  );
}
