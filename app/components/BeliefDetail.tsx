"use client";

import { useCallback } from "react";
import {
  useFlowStore,
  type BeliefDetail as BeliefDetailType,
  type BeliefType,
  type BeliefImpact,
  type BeliefEmotion,
  type BeliefOrigin,
} from "../store";
import Breadcrumb from "./Breadcrumb";
import ThemeToggle from "./ThemeToggle";

const BELIEF_TYPES: { value: BeliefType; label: string }[] = [
  { value: "belief", label: "Creencia" },
  { value: "hypothesis", label: "Hipótesis" },
  { value: "value", label: "Valor" },
  { value: "rule", label: "Regla" },
  { value: "observation", label: "Observación" },
];

const IMPACT_OPTIONS: { value: BeliefImpact; label: string }[] = [
  { value: "bajo", label: "Bajo" },
  { value: "medio", label: "Medio" },
  { value: "alto", label: "Alto" },
];

const EMOTION_OPTIONS: { value: BeliefEmotion; label: string }[] = [
  { value: "miedo", label: "Miedo" },
  { value: "seguridad", label: "Seguridad" },
  { value: "culpa", label: "Culpa" },
  { value: "orgullo", label: "Orgullo" },
  { value: "deseo", label: "Deseo" },
  { value: "tristeza", label: "Tristeza" },
  { value: "enojo", label: "Enojo" },
  { value: "neutral", label: "Neutral" },
];

const ORIGIN_OPTIONS: { value: BeliefOrigin; label: string }[] = [
  { value: "experiencia personal", label: "Experiencia personal" },
  { value: "familia", label: "Familia" },
  { value: "cultura", label: "Cultura" },
  { value: "educacion", label: "Educación" },
  { value: "lectura", label: "Lectura" },
  { value: "observacion", label: "Observación" },
  { value: "intuicion", label: "Intuición" },
  { value: "otro", label: "Otro" },
];

const DEFAULT_DETAIL: BeliefDetailType = {
  title: "",
  content: "",
  type: "belief",
  confidence: 0.5,
  impact: "medio",
  emotion: "neutral",
  origin: "experiencia personal",
  originOther: "",
  justification: "",
  context: "",
  description: "",
  q1_true: "",
  q2_absolute: "",
  q3_emotions: "",
  q3_images: "",
  q3_behavior: "",
  q4_identity: "",
  q4_experience: "",
  turnarounds: "",
};

function typeLabel(type: BeliefType): string {
  return BELIEF_TYPES.find((t) => t.value === type)?.label || type;
}

export default function BeliefDetail() {
  const currentView = useFlowStore((s) => s.currentView);
  const beliefDetails = useFlowStore((s) => s.beliefDetails);
  const sectorCanvases = useFlowStore((s) => s.sectorCanvases);
  const updateBeliefDetail = useFlowStore((s) => s.updateBeliefDetail);
  const navigateTo = useFlowStore((s) => s.navigateTo);
  const darkMode = useFlowStore((s) => s.darkMode);

  if (currentView.view !== "detail") return null;

  const { sectorId, nodeId } = currentView;
  const detail: BeliefDetailType = {
    ...DEFAULT_DETAIL,
    ...beliefDetails[nodeId],
  };

  // Fall back to node label if no title saved yet
  const canvas = sectorCanvases[sectorId] || { nodes: [], edges: [] };
  const node = canvas.nodes.find((n) => n.id === nodeId);
  const title = detail.title || (node?.data?.label as string) || "";

  const update = useCallback(
    (patch: Partial<BeliefDetailType>) => {
      updateBeliefDetail(nodeId, patch);
    },
    [nodeId, updateBeliefDetail]
  );

  return (
    <div className="belief-detail" data-theme={darkMode ? "dark" : "light"}>
      <Breadcrumb />
      <ThemeToggle />

      <div className="bd-content">
        <button
          className="bd-back"
          onClick={() => navigateTo({ view: "canvas", sectorId })}
        >
          ← Volver al canvas
        </button>

        {/* ── 1. Encabezado ── */}
        <section className="bd-section">
          <input
            className="bd-title"
            value={title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Escribe la creencia principal…"
          />
          <div className="bd-subtitle-row">
            <span className="bd-tag">{typeLabel(detail.type)}</span>
            <span className="bd-tag">
              Certeza: {Math.round(detail.confidence * 100)}%
            </span>
          </div>
        </section>

        {/* ── 2. Propiedades cognitivas ── */}
        <section className="bd-section bd-props">
          <h2 className="bd-section-title">Propiedades cognitivas</h2>

          <div className="bd-props-grid">
            {/* Tipo */}
            <div className="bd-field">
              <label className="bd-label">Tipo de creencia</label>
              <select
                className="bd-select"
                value={detail.type}
                onChange={(e) => update({ type: e.target.value as BeliefType })}
              >
                {BELIEF_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Confianza */}
            <div className="bd-field">
              <label className="bd-label">
                Qué tan cierto es para mí
                <span className="bd-label-value">
                  {Math.round(detail.confidence * 100)}%
                </span>
              </label>
              <input
                className="bd-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={detail.confidence}
                onChange={(e) =>
                  update({ confidence: parseFloat(e.target.value) })
                }
              />
            </div>

            {/* Impacto */}
            <div className="bd-field">
              <label className="bd-label">Impacto en mi vida</label>
              <div className="bd-radio-group">
                {IMPACT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`bd-radio-btn ${detail.impact === opt.value ? "active" : ""}`}
                    onClick={() => update({ impact: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emoción */}
            <div className="bd-field">
              <label className="bd-label">Emoción asociada</label>
              <select
                className="bd-select"
                value={detail.emotion}
                onChange={(e) =>
                  update({ emotion: e.target.value as BeliefEmotion })
                }
              >
                {EMOTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Origen */}
            <div className="bd-field">
              <label className="bd-label">De dónde viene</label>
              <select
                className="bd-select"
                value={detail.origin}
                onChange={(e) =>
                  update({ origin: e.target.value as BeliefOrigin })
                }
              >
                {ORIGIN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {detail.origin === "otro" && (
                <input
                  className="bd-input bd-origin-other"
                  value={detail.originOther}
                  onChange={(e) => update({ originOther: e.target.value })}
                  placeholder="Especifica el origen…"
                />
              )}
            </div>
          </div>
        </section>

        {/* ── 3. Indagación de la creencia ── */}
        <section className="bd-section bd-inquiry">
          <h2 className="bd-section-title">Indagación de la creencia</h2>

          {/* Descripción */}
          <div className="bd-field">
            <label className="bd-label">Descripción de la creencia</label>
            <textarea
              className="bd-textarea"
              value={detail.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Describe la creencia con más detalle…"
              rows={3}
            />
          </div>

          {/* Pregunta 1 */}
          <div className="bd-inquiry-question">
            <p className="bd-question-text">¿Es verdad?</p>
            <div className="bd-yn-group">
              <button
                className={`bd-yn-btn ${detail.q1_true === "si" ? "active" : ""}`}
                onClick={() => update({ q1_true: "si" })}
              >
                Sí
              </button>
              <button
                className={`bd-yn-btn ${detail.q1_true === "no" ? "active" : ""}`}
                onClick={() => update({ q1_true: "no", q2_absolute: "" })}
              >
                No
              </button>
            </div>
          </div>

          {/* Pregunta 2 — solo si q1 = sí */}
          {detail.q1_true === "si" && (
            <div className="bd-inquiry-question bd-inquiry-nested">
              <p className="bd-question-text">
                ¿Puedes saber que es verdad con absoluta certeza?
              </p>
              <div className="bd-yn-group">
                <button
                  className={`bd-yn-btn ${detail.q2_absolute === "si" ? "active" : ""}`}
                  onClick={() => update({ q2_absolute: "si" })}
                >
                  Sí
                </button>
                <button
                  className={`bd-yn-btn ${detail.q2_absolute === "no" ? "active" : ""}`}
                  onClick={() => update({ q2_absolute: "no" })}
                >
                  No
                </button>
              </div>
            </div>
          )}

          {/* Pregunta 3 — Reacciones */}
          <div className="bd-inquiry-question">
            <p className="bd-question-text">
              ¿Cómo reaccionas cuando crees este pensamiento?
            </p>

            <div className="bd-inquiry-subfields">
              <div className="bd-field">
                <label className="bd-label">¿Qué emociones aparecen?</label>
                <textarea
                  className="bd-textarea"
                  value={detail.q3_emotions}
                  onChange={(e) => update({ q3_emotions: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="bd-field">
                <label className="bd-label">
                  ¿Qué recuerdos o escenarios futuros aparecen?
                </label>
                <textarea
                  className="bd-textarea"
                  value={detail.q3_images}
                  onChange={(e) => update({ q3_images: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="bd-field">
                <label className="bd-label">
                  ¿Cómo te tratas a ti o a otros cuando lo crees?
                </label>
                <textarea
                  className="bd-textarea"
                  value={detail.q3_behavior}
                  onChange={(e) => update({ q3_behavior: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Pregunta 4 — Sin el pensamiento */}
          <div className="bd-inquiry-question">
            <p className="bd-question-text">
              ¿Quién serías sin este pensamiento?
            </p>

            <div className="bd-inquiry-subfields">
              <div className="bd-field">
                <label className="bd-label">¿Quién o qué eres sin él?</label>
                <textarea
                  className="bd-textarea"
                  value={detail.q4_identity}
                  onChange={(e) => update({ q4_identity: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="bd-field">
                <label className="bd-label">
                  ¿Cómo sería tu vida sin este pensamiento?
                </label>
                <textarea
                  className="bd-textarea"
                  value={detail.q4_experience}
                  onChange={(e) => update({ q4_experience: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Inversión del pensamiento */}
          <div className="bd-inquiry-question">
            <p className="bd-question-text">Invierte el pensamiento</p>
            <p className="bd-question-hint">
              Escribe versiones opuestas o alternativas de la creencia y
              considera cómo cada una podría ser tan o más verdadera.
            </p>
            <div className="bd-field">
              <label className="bd-label">Inversiones posibles</label>
              <textarea
                className="bd-textarea"
                value={detail.turnarounds}
                onChange={(e) => update({ turnarounds: e.target.value })}
                placeholder="Ej: Yo me lastimé. Yo lo lastimé. Él no me lastimó…"
                rows={4}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
