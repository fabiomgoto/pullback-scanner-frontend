import { useState, useEffect, useCallback } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const API_URL = "http://localhost:3001/api"; // Alterar para URL do Railway em produção

// ── API SERVICE ───────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const api = {
  getSignals: (p = {}) => {
    const qs = new URLSearchParams(p).toString();
    return apiFetch(`/signals${qs ? "?" + qs : ""}`);
  },
  getSignal:    (id) => apiFetch(`/signals/${id}`),
  ignoreSignal: (id) => apiFetch(`/signals/${id}/ignore`, { method: "PUT" }),
  triggerScan:  ()   => apiFetch("/signals/scan", { method: "POST" }),
  getMacro:     ()   => apiFetch("/macro"),
  getConfig:    ()   => apiFetch("/config"),
  updateConfig: (d)  => apiFetch("/config", { method: "PUT", body: JSON.stringify(d) }),
  health:       ()   => apiFetch("/health"),
};

// ── DEMO DATA (quando backend offline) ───────────────────────────────────────
function gerarDemoSignals() {
  const ativos = [
    { ticker: "PETR3", empresa: "Petrobras", sector: "Petróleo e Gás" },
    { ticker: "VALE3", empresa: "Vale", sector: "Mineração" },
    { ticker: "WEGE3", empresa: "WEG", sector: "Indústria" },
    { ticker: "ITUB4", empresa: "Itaú Unibanco", sector: "Bancário" },
    { ticker: "RDOR3", empresa: "Rede D'Or", sector: "Saúde" },
    { ticker: "EQTL3", empresa: "Equatorial", sector: "Energia Elétrica" },
    { ticker: "TOTS3", empresa: "Totvs", sector: "Tecnologia" },
    { ticker: "SUZB3", empresa: "Suzano", sector: "Papel e Celulose" },
  ];

  return ativos.map((a, i) => {
    const score = 55 + Math.floor(Math.random() * 45);
    const preco = 20 + Math.random() * 80;
    const mm50  = preco * (1.01 + Math.random() * 0.05);
    return {
      id: `demo-${i}`,
      ticker: a.ticker,
      company_name: a.empresa,
      sector: a.sector,
      price: parseFloat(preco.toFixed(2)),
      price_change_pct: parseFloat((-1 - Math.random() * 5).toFixed(2)),
      mm50: parseFloat(mm50.toFixed(2)),
      mm200: parseFloat((mm50 * 0.92).toFixed(2)),
      rsi: parseFloat((36 + Math.random() * 13).toFixed(1)),
      retraction_pct: parseFloat((3 + Math.random() * 10).toFixed(1)),
      volume: Math.round(10e6 + Math.random() * 40e6),
      volume_avg20: Math.round(8e6 + Math.random() * 20e6),
      score_technical: score,
      score_macro: null,
      score_fundamentals: null,
      score_total: score,
      entry_zone_min: parseFloat((preco * 0.995).toFixed(2)),
      entry_zone_max: parseFloat((mm50 * 1.005).toFixed(2)),
      invalidation_level: parseFloat((preco * 0.97).toFixed(2)),
      status: "active",
      criteria_detail: [
        { codigo: "C1", label: `MM50 (${mm50.toFixed(2)}) > MM200 — Tendência confirmada`, ok: true },
        { codigo: "C2", label: `Retração ${(3 + Math.random() * 10).toFixed(1)}% do topo`, ok: true },
        { codigo: "C3", label: `RSI ${(36 + Math.random() * 13).toFixed(1)} — zona de sobrevenda relativa`, ok: Math.random() > 0.4 },
        { codigo: "C4", label: "Volume acima da média × 1.2", ok: Math.random() > 0.5 },
        { codigo: "C5", label: "Preço próximo ao suporte MM50 (±2%)", ok: Math.random() > 0.6 },
      ],
    };
  }).sort((a, b) => b.score_total - a.score_total);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const toNum = (v) => (v != null && v !== "") ? Number(v) : null;
const fmtBRL = (v) => toNum(v) != null ? "R$" + toNum(v).toFixed(2) : "—";
const fmtPct = (v) => toNum(v) != null ? (toNum(v) > 0 ? "+" : "") + toNum(v).toFixed(2) + "%" : "—";
const scoreClass = (s) => Number(s) >= 75 ? "high" : Number(s) >= 50 ? "medium" : "low";
const scoreColor = (s) => Number(s) >= 75 ? "#00d4a0" : Number(s) >= 50 ? "#f5c842" : "#ff4d6d";
const macroLabel = { favorable: "Favorável", neutral: "Neutro", adverse: "Adverso" };
const macroColor = { favorable: "#00d4a0", neutral: "#f5c842", adverse: "#ff4d6d" };

// ── STYLES ────────────────────────────────────────────────────────────────────
const G = {
  bg:       "#080c10",
  surface:  "#0d1318",
  surface2: "#121920",
  border:   "rgba(255,255,255,0.06)",
  border2:  "rgba(255,255,255,0.1)",
  text:     "#e8edf2",
  muted:    "#5a6a7a",
  green:    "#00d4a0",
  yellow:   "#f5c842",
  red:      "#ff4d6d",
  blue:     "#4d9fff",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${G.bg};
    color: ${G.text};
    font-family: 'Syne', sans-serif;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${G.surface}; }
  ::-webkit-scrollbar-thumb { background: ${G.muted}; border-radius: 2px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes scanLine {
    0%   { top: 0; opacity: 0.6; }
    100% { top: 100%; opacity: 0; }
  }

  .fade-up { animation: fadeUp 0.35s ease both; }

  .btn {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.04em;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: all 0.18s;
  }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary  { background: ${G.green}; color: ${G.bg}; padding: 10px 22px; }
  .btn-primary:not(:disabled):hover { background: #00f0b8; transform: translateY(-1px); }
  .btn-ghost    { background: transparent; color: ${G.text}; padding: 9px 18px;
                  border: 1px solid ${G.border2}; }
  .btn-ghost:hover { border-color: ${G.green}; color: ${G.green}; }
  .btn-danger   { background: transparent; color: ${G.red}; padding: 7px 14px;
                  border: 1px solid rgba(255,77,109,0.3); font-size: 11px; }
  .btn-danger:hover { background: rgba(255,77,109,0.1); }

  .mono { font-family: 'JetBrains Mono', monospace; }
  .tag  {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 3px 8px;
    border: 1px solid;
    display: inline-block;
  }
`;

// ── COMPONENTES ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 56 }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={G.surface2} strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="14" fontWeight="700"
        fontFamily="JetBrains Mono" style={{ transform: `rotate(90deg) translate(0, -${size}px)` }}>
        {score}
      </text>
    </svg>
  );
}

function MacroBadge({ rating }) {
  if (!rating) return null;
  const color = macroColor[rating] || G.muted;
  return (
    <span className="tag" style={{ borderColor: color + "40", color, background: color + "12" }}>
      {macroLabel[rating] || rating}
    </span>
  );
}

function SignalCard({ signal, onIgnore, onDetail, delay = 0 }) {
  const sc = scoreClass(signal.score_total);
  const sideColor = scoreColor(signal.score_total);
  const volRatio = signal.volume && signal.volume_avg20
    ? ((toNum(signal.volume) / toNum(signal.volume_avg20)) * 100).toFixed(0) : null;

  return (
    <div className="fade-up" style={{ animationDelay: `${delay}s` }}
      onClick={() => onDetail(signal)}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = sideColor + "50"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = G.border; }}
      style={{
        background: G.surface, border: `1px solid ${G.border}`,
        padding: "22px", cursor: "pointer", position: "relative",
        overflow: "hidden", transition: "all 0.2s",
      }}>

      {/* Barra lateral colorida */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: sideColor }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ paddingLeft: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.02em" }}>{signal.ticker}</div>
          <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{signal.company_name}</div>
          <div style={{ fontSize: 10, color: G.muted, fontFamily: "JetBrains Mono", marginTop: 3 }}>{signal.sector}</div>
        </div>
        <ScoreRing score={signal.score_total} />
      </div>

      {/* Score bar */}
      <div style={{ height: 3, background: G.surface2, marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${signal.score_total}%`, background: sideColor, transition: "width 0.8s" }} />
      </div>

      {/* Indicadores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "MM50", value: fmtBRL(signal.mm50), color: G.green },
          { label: "RSI", value: toNum(signal.rsi)?.toFixed(1) ?? "—", color: G.yellow },
          { label: "Retração", value: signal.retraction_pct ? `-${signal.retraction_pct}%` : "—", color: G.red },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: G.surface2, padding: "8px 10px" }}>
            <div className="mono" style={{ fontSize: 8, color: G.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
            <div className="mono" style={{ fontSize: 12, fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Preço + variação */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 0", borderTop: `1px solid ${G.border}`, borderBottom: `1px solid ${G.border}`, marginBottom: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 9, color: G.muted, letterSpacing: "0.12em" }}>PREÇO ATUAL</div>
          <div className="mono" style={{ fontSize: 17, fontWeight: 500 }}>{fmtBRL(signal.price)}</div>
        </div>
        <div className="mono" style={{
          fontSize: 12, padding: "4px 10px",
          background: toNum(signal.price_change_pct) < 0 ? "rgba(255,77,109,0.1)" : "rgba(0,212,160,0.1)",
          color: toNum(signal.price_change_pct) < 0 ? G.red : G.green,
        }}>
          {fmtPct(signal.price_change_pct)}
        </div>
      </div>

      {/* Zona de entrada */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: 9, color: G.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Zona de entrada</span>
        <span className="mono" style={{ fontSize: 11, color: G.green }}>{fmtBRL(signal.entry_zone_min)} – {fmtBRL(signal.entry_zone_max)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span className="mono" style={{ fontSize: 9, color: G.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Invalidação</span>
        <span className="mono" style={{ fontSize: 11, color: G.red }}>{fmtBRL(signal.invalidation_level)}</span>
      </div>

      {/* Tags + ignorar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {toNum(signal.mm50) > toNum(signal.mm200) && <span className="tag" style={{ borderColor: "rgba(77,159,255,0.3)", color: G.blue, background: "rgba(77,159,255,0.08)" }}>MM50&gt;MM200</span>}
          {toNum(signal.rsi) >= 35 && toNum(signal.rsi) <= 50 && <span className="tag" style={{ borderColor: "rgba(245,200,66,0.3)", color: G.yellow, background: "rgba(245,200,66,0.08)" }}>RSI OK</span>}
          {volRatio && parseInt(volRatio) > 120 && <span className="tag" style={{ borderColor: "rgba(0,212,160,0.3)", color: G.green, background: "rgba(0,212,160,0.08)" }}>VOL+</span>}
        </div>
        <button className="btn btn-danger" onClick={e => { e.stopPropagation(); onIgnore(signal.id); }}>
          Ignorar
        </button>
      </div>
    </div>
  );
}

function DetailModal({ signal, onClose }) {
  if (!signal) return null;
  const sc = scoreColor(signal.score_total);

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(8,12,16,0.92)",
        zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, backdropFilter: "blur(8px)",
      }}>
      <div style={{
        background: G.surface, border: `1px solid ${G.border2}`,
        width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto",
        animation: "fadeUp 0.25s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: "22px 28px", borderBottom: `1px solid ${G.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, background: G.surface, zIndex: 1,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 800 }}>{signal.ticker}</span>
              <ScoreRing score={signal.score_total} size={44} />
            </div>
            <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>{signal.company_name} · {signal.sector}</div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "6px 12px" }}>✕</button>
        </div>

        <div style={{ padding: "24px 28px" }}>

          {/* Score breakdown */}
          <Section title="Score">
            {[
              { label: "Técnico", score: signal.score_technical, color: sc },
              { label: "Macro", score: signal.score_macro, color: G.blue },
              { label: "Fundamentos", score: signal.score_fundamentals, color: G.yellow },
            ].map(({ label, score, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span className="mono" style={{ fontSize: 10, color: G.muted, width: 90, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: 6, background: G.surface2 }}>
                  {score != null && <div style={{ height: "100%", width: `${score}%`, background: color, transition: "width 0.7s" }} />}
                </div>
                <span className="mono" style={{ fontSize: 12, width: 36, textAlign: "right", color: score != null ? color : G.muted }}>
                  {score != null ? score : "—"}
                </span>
              </div>
            ))}
            {(signal.score_macro == null) && (
              <div className="mono" style={{ fontSize: 10, color: G.muted, marginTop: 4 }}>
                Dados de macro e fundamentos não disponíveis para este sinal
              </div>
            )}
            {signal.macro_context && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(77,159,255,0.06)", borderLeft: "2px solid " + G.blue }}>
                <div className="mono" style={{ fontSize: 9, color: G.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Contexto macro</div>
                <div style={{ fontSize: 12, color: "#8a9aaa", lineHeight: 1.6 }}>{signal.macro_context}</div>
              </div>
            )}
            {signal.fundamentals_summary && (
              <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(245,200,66,0.06)", borderLeft: "2px solid " + G.yellow }}>
                <div className="mono" style={{ fontSize: 9, color: G.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Fundamentos</div>
                <div style={{ fontSize: 12, color: "#8a9aaa", lineHeight: 1.6 }}>{signal.fundamentals_summary}</div>
              </div>
            )}
          </Section>

          {/* Indicadores técnicos */}
          <Section title="Indicadores técnicos">
            <Grid3>
              {[
                { label: "Preço", value: fmtBRL(signal.price) },
                { label: "MM50", value: fmtBRL(signal.mm50), color: G.green },
                { label: "MM200", value: fmtBRL(signal.mm200), color: G.blue },
                { label: "RSI (14)", value: toNum(signal.rsi)?.toFixed(1), color: G.yellow },
                { label: "Retração", value: signal.retraction_pct ? `-${signal.retraction_pct}%` : "—", color: G.red },
                { label: "Vol / MM20", value: signal.volume && signal.volume_avg20
                    ? `${((toNum(signal.volume) / toNum(signal.volume_avg20)) * 100).toFixed(0)}%`
                    : "—",
                  color: toNum(signal.volume) > toNum(signal.volume_avg20) * 1.2 ? G.green : G.muted },
              ].map(({ label, value, color }) => (
                <StatBox key={label} label={label} value={value} color={color} />
              ))}
            </Grid3>
          </Section>

          {/* Zonas */}
          <Section title="Zonas operacionais">
            <Grid3>
              <StatBox label="Entrada mín." value={fmtBRL(signal.entry_zone_min)} color={G.green} />
              <StatBox label="Entrada máx." value={fmtBRL(signal.entry_zone_max)} color={G.green} />
              <StatBox label="Invalidação" value={fmtBRL(signal.invalidation_level)} color={G.red} />
            </Grid3>
          </Section>

          {/* Critérios */}
          {signal.criteria_detail?.length > 0 && (
            <Section title="Critérios avaliados" last>
              {signal.criteria_detail.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <span className="mono" style={{ fontSize: 13, color: c.ok ? G.green : G.red, flexShrink: 0, marginTop: 1 }}>
                    {c.ok ? "✓" : "✗"}
                  </span>
                  <span style={{ fontSize: 13, color: c.ok ? G.text : G.muted, lineHeight: 1.5 }}>{c.label}</span>
                </div>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 24, paddingBottom: last ? 0 : 24, borderBottom: last ? "none" : `1px solid ${G.border}` }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: G.muted, marginBottom: 14 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Grid3({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>{children}</div>;
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: G.surface2, padding: "12px 14px" }}>
      <div className="mono" style={{ fontSize: 8, color: G.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 500, color: color || G.text }}>{value || "—"}</div>
    </div>
  );
}


function LegendaPanel() {
  const [aberta, setAberta] = useState(false);

  const itens = [
    {
      icone: "◎",
      titulo: "Score (0–100)",
      cor: "#00d4a0",
      desc: "Nota geral do sinal. Soma dos critérios técnicos atendidos.",
      detalhes: [
        { faixa: "≥ 75", label: "Alto", cor: "#00d4a0", desc: "Sinal forte — todos ou quase todos critérios ok" },
        { faixa: "50–74", label: "Médio", cor: "#f5c842", desc: "Sinal razoável — critérios mínimos atendidos" },
        { faixa: "< 50", label: "Baixo", cor: "#ff4d6d", desc: "Filtrado — não aparece no dashboard" },
      ]
    },
    {
      icone: "⌇",
      titulo: "MM50 (Média Móvel 50 dias)",
      cor: "#00d4a0",
      desc: "Suporte dinâmico. Quando MM50 > MM200, a tendência é de alta (Golden Cross). O preço tende a 'quicar' nessa linha em pullbacks saudáveis.",
    },
    {
      icone: "⌇",
      titulo: "MM200 (Média Móvel 200 dias)",
      cor: "#4d9fff",
      desc: "Tendência de longo prazo. MM50 acima dela confirma que o ativo está em uptrend. Critério obrigatório para o sinal aparecer.",
    },
    {
      icone: "~",
      titulo: "RSI (Índice de Força Relativa)",
      cor: "#f5c842",
      desc: "Mede a força do movimento. Entre 35 e 50 indica sobrevenda relativa — a pressão vendedora está diminuindo, o que favorece reversão.",
      detalhes: [
        { faixa: "< 35", label: "Sobrevenda", cor: "#ff4d6d", desc: "Queda excessiva — possível pânico" },
        { faixa: "35–50", label: "Zona ideal", cor: "#00d4a0", desc: "Pressão vendedora cedendo — melhor entrada" },
        { faixa: "> 60", label: "Sobrecompra", cor: "#f5c842", desc: "Ativo esticado — evitar entrada" },
      ]
    },
    {
      icone: "↓",
      titulo: "Retração",
      cor: "#ff4d6d",
      desc: "Quanto o preço caiu do topo recente (últimos 20 dias). Entre 3% e 15% é a zona válida de pullback — nem queda demais, nem de menos.",
      detalhes: [
        { faixa: "< 3%", label: "Insuficiente", cor: "#5a6a7a", desc: "Não é um pullback relevante" },
        { faixa: "3–15%", label: "Zona válida", cor: "#00d4a0", desc: "Pullback saudável dentro da tendência" },
        { faixa: "> 15%", label: "Excessiva", cor: "#ff4d6d", desc: "Pode ser reversão de tendência" },
      ]
    },
    {
      icone: "→",
      titulo: "Zona de Entrada",
      cor: "#00d4a0",
      desc: "Faixa de preço onde faz sentido comprar. Calculada entre o preço atual e a MM50 (±0,5%). Se o ativo abrir dentro dessa faixa, é a região de entrada.",
    },
    {
      icone: "✕",
      titulo: "Invalidação (Stop Loss)",
      cor: "#ff4d6d",
      desc: "Se o preço fechar abaixo deste nível, o pullback virou queda — o sinal é invalidado. Use como referência de stop loss para proteger o capital.",
    },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={() => setAberta(!aberta)}
        className="btn btn-ghost"
        style={{ width: "100%", justifyContent: "space-between", padding: "14px 20px",
          borderColor: aberta ? "#00d4a0" : "rgba(255,255,255,0.1)" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#00d4a0" }}>?</span>
          Como ler os indicadores
        </span>
        <span className="mono" style={{ fontSize: 11, color: "#5a6a7a" }}>
          {aberta ? "▲ fechar" : "▼ abrir"}
        </span>
      </button>

      {aberta && (
        <div style={{ background: "#0d1318", border: "1px solid rgba(255,255,255,0.06)",
          borderTop: "none", padding: "24px 28px", animation: "fadeUp 0.2s ease" }}>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {itens.map((item, i) => (
              <div key={i} style={{ background: "#121920", padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: item.cor, fontSize: 16, fontWeight: 700 }}>{item.icone}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.titulo}</span>
                </div>
                <p style={{ fontSize: 12, color: "#8a9aaa", lineHeight: 1.6, marginBottom: item.detalhes ? 12 : 0 }}>
                  {item.desc}
                </p>
                {item.detalhes && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {item.detalhes.map((d, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="mono" style={{ fontSize: 10, color: d.cor, width: 48,
                          flexShrink: 0, background: d.cor + "15", padding: "2px 6px", textAlign: "center" }}>
                          {d.faixa}
                        </span>
                        <span style={{ fontSize: 11, color: "#6a7a8a" }}>{d.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: "14px 18px", background: "rgba(0,212,160,0.06)",
            border: "1px solid rgba(0,212,160,0.15)" }}>
            <div className="mono" style={{ fontSize: 9, color: "#00d4a0", letterSpacing: "0.2em",
              textTransform: "uppercase", marginBottom: 8 }}>Exemplo de leitura — VALE3 Score 85</div>
            <p style={{ fontSize: 13, color: "#8a9aaa", lineHeight: 1.7 }}>
              "VALE3 caiu <span style={{color:"#ff4d6d"}}>3,78%</span> do topo recente, está testando o suporte MM50 em{" "}
              <span style={{color:"#00d4a0"}}>R$83,14</span>. RSI em{" "}
              <span style={{color:"#f5c842"}}>46,6</span> indica pressão vendedora cedendo.
              Zona de entrada: <span style={{color:"#00d4a0"}}>R$81,38–R$83,56</span>.
              Se cair abaixo de <span style={{color:"#ff4d6d"}}>R$79,34</span>, sair da operação."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MacroPanel({ macro }) {
  if (!macro) return null;
  const color = macroColor[macro.macro_rating] || G.muted;
  return (
    <div style={{
      background: G.surface, border: `1px solid ${G.border}`,
      padding: "16px 24px", display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center",
      marginBottom: 24,
    }}>
      <div>
        <div className="mono" style={{ fontSize: 9, color: G.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Ambiente macro</div>
        <MacroBadge rating={macro.macro_rating} />
      </div>
      {[
        { label: "Selic", value: macro.selic ? `${macro.selic}% a.a.` : "—" },
        { label: "USD/BRL", value: macro.usd_brl ? `R$${Number(macro.usd_brl).toFixed(4)}` : "—" },
        { label: "IBOV 5d", value: toNum(macro.ibov_5d_change) != null ? fmtPct(macro.ibov_5d_change) : "—",
          color: toNum(macro.ibov_5d_change) > 0 ? G.green : G.red },
      ].map(({ label, value, color: c }) => (
        <div key={label}>
          <div className="mono" style={{ fontSize: 9, color: G.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 500, color: c || G.text }}>{value}</div>
        </div>
      ))}
      {macro.macro_events && (
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="mono" style={{ fontSize: 9, color: G.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Contexto</div>
          <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.5 }}>{macro.macro_events}</div>
        </div>
      )}
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function PullbackScanner() {
  const [signals, setSignals] = useState([]);
  const [macro, setMacro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [apiUrl, setApiUrl] = useState(API_URL);
  const [showConfig, setShowConfig] = useState(false);

  const fetchData = useCallback(async (url = apiUrl) => {
    setLoading(true);
    setError(null);
    try {
      const [sinaisRes, macroRes] = await Promise.all([
        fetch(`${url}/signals`).then(r => r.json()),
        fetch(`${url}/macro`).then(r => r.json()).catch(() => null),
      ]);
      setSignals(sinaisRes.signals || []);
      setMacro(macroRes);
      setIsDemo(false);
      setLastUpdate(new Date());
    } catch {
      // Backend offline → modo demo
      setSignals(gerarDemoSignals());
      setMacro({ selic: 13.75, usd_brl: 5.18, ibov_5d_change: -0.8, macro_rating: "neutral", macro_events: "Modo demo — conecte o backend para dados reais" });
      setIsDemo(true);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => { fetchData(); }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await fetch(`${apiUrl}/signals/scan`, { method: "POST" });
      setTimeout(() => { fetchData(); setScanning(false); }, 4000);
    } catch {
      setScanning(false);
    }
  };

  const handleIgnore = (id) => setSignals(prev => prev.filter(s => s.id !== id));

  const signalsFiltrados = signals.filter(s => {
    if (filtro === "high") return Number(s.score_total) >= 75;
    if (filtro === "medium") return Number(s.score_total) >= 50 && s.score_total < 75;
    return true;
  });

  const avgScore = signals.length > 0
    ? Math.round(signals.reduce((a, b) => a + b.score_total, 0) / signals.length) : 0;
  const maxScore = signals.length > 0 ? signals[0].score_total : 0;

  return (
    <>
      <style>{css}</style>

      {/* HEADER */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,12,16,0.95)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${G.border}`,
        padding: "0 32px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, background: G.green, color: G.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 16,
            clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
          }}>P</div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "0.04em" }}>
            Pullback<span style={{ color: G.green }}>Scanner</span> B3
          </div>
          {isDemo && (
            <span className="tag" style={{ borderColor: "rgba(245,200,66,0.4)", color: G.yellow, background: "rgba(245,200,66,0.08)" }}>
              DEMO
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {[
            { label: "Sinais", value: signals.length, color: G.green },
            { label: "Score médio", value: avgScore || "—" },
            { label: "Atualizado", value: lastUpdate ? lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: 9, color: G.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 500, color: color || G.text }}>{value}</div>
            </div>
          ))}
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isDemo ? G.yellow : G.green,
            boxShadow: `0 0 8px ${isDemo ? G.yellow : G.green}`,
            animation: "pulse 2s infinite",
          }} />
        </div>
      </div>

      {/* MAIN */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 80px" }}>

        {/* Config API URL */}
        <div style={{ marginBottom: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: G.surface, border: `1px solid ${G.border2}`, padding: "8px 14px", flex: 1, maxWidth: 400,
          }}>
            <span className="mono" style={{ fontSize: 10, color: G.muted, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>API URL</span>
            <input
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              onBlur={() => fetchData(apiUrl)}
              style={{
                background: "none", border: "none", outline: "none",
                color: G.text, fontFamily: "JetBrains Mono, monospace", fontSize: 12, flex: 1,
              }}
              placeholder="http://localhost:3001/api"
            />
          </div>
          <button className="btn btn-primary" onClick={handleScan} disabled={scanning || isDemo}>
            {scanning ? "⟳ Varrendo..." : "▶ Nova Varredura"}
          </button>
          <button className="btn btn-ghost" onClick={() => fetchData()}>
            ↻ Atualizar
          </button>
        </div>

        {/* LEGENDA */}
        <LegendaPanel />

        {/* MACRO PANEL */}
        {macro && <MacroPanel macro={macro} />}

        {/* SUMMARY */}
        {!loading && signals.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)",
            gap: 1, background: G.border, border: `1px solid ${G.border}`,
            marginBottom: 24,
          }}>
            {[
              { label: "Pullbacks detectados", value: signals.length, color: G.green },
              { label: "Score alto (≥75)", value: signals.filter(s => Number(s.score_total) >= 75).length, color: G.green },
              { label: "Score médio", value: avgScore, color: G.yellow },
              { label: "Score máximo", value: maxScore, color: scoreColor(maxScore) },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: G.surface, padding: "16px 20px" }}>
                <div className="mono" style={{ fontSize: 9, color: G.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 500, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* FILTROS */}
        {signals.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 12 }}>
              Pullbacks Identificados
              <span className="mono" style={{
                fontSize: 12, padding: "4px 12px",
                background: "rgba(0,212,160,0.1)", color: G.green,
                border: "1px solid rgba(0,212,160,0.2)",
              }}>{signalsFiltrados.length}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { key: "todos", label: "Todos" },
                { key: "high", label: "Score alto ≥75" },
                { key: "medium", label: "Médio 50–74" },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setFiltro(key)}
                  className="btn" style={{
                    fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.1em",
                    textTransform: "uppercase", padding: "7px 14px",
                    border: `1px solid ${filtro === key ? G.green : G.border2}`,
                    background: filtro === key ? "rgba(0,212,160,0.08)" : "transparent",
                    color: filtro === key ? G.green : G.muted,
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 32px" }}>
            <div style={{
              width: 40, height: 40, border: `3px solid ${G.border}`,
              borderTopColor: G.green, borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 20px",
            }} />
            <div className="mono" style={{ fontSize: 12, color: G.muted }}>Conectando ao backend...</div>
          </div>
        )}

        {/* GRID DE SINAIS */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {signalsFiltrados.map((s, i) => (
              <SignalCard
                key={s.id}
                signal={s}
                delay={i * 0.04}
                onIgnore={handleIgnore}
                onDetail={setSelectedSignal}
              />
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading && signals.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 32px", color: G.muted }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📡</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: G.text, opacity: 0.4, marginBottom: 8 }}>Nenhum pullback hoje</div>
            <div className="mono" style={{ fontSize: 12 }}>
              {isDemo ? "Backend offline — usando dados demo" : "Execute uma varredura para analisar o mercado"}
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {selectedSignal && (
        <DetailModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
      )}
    </>
  );
}
