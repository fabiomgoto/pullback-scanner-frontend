import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart,
} from "recharts";

// ── CONSTANTES ──────────────────────────────────────────────────────────────────
const FII_COLORS = {
  HGLG11: "#d4a94a",
  RZTR11: "#4ade80",
  SNCI11: "#60a5fa",
  SNAG11: "#f87171",
  RZAK11: "#a78bfa",
  KNCR11: "#fb923c",
};
const EXTRA_COLORS = ["#22d3ee", "#f472b6", "#a3e635", "#facc15", "#94a3b8"];
const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function getFiiColor(ticker, idx) {
  return FII_COLORS[ticker] ?? EXTRA_COLORS[idx % EXTRA_COLORS.length];
}

function getMesLabel(d) {
  return `${MESES_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

// ── HELPERS ─────────────────────────────────────────────────────────────────────
function fmtBRL(v) {
  if (v == null || isNaN(v)) return "—";
  return "R$ " + Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(v) {
  if (v == null || isNaN(v)) return "—";
  return (Number(v) > 0 ? "+" : "") + Number(v).toFixed(2) + "%";
}

// ── DEMO DATA ───────────────────────────────────────────────────────────────────
function gerarDemoData() {
  const fiisBase = [
    { ticker: "HGLG11", nome: "CSHG Logística",    cotas: 120, custoMedio: 163.45, precoAtual: 156.50, dyPorCota: 0.72, aportes: 3 },
    { ticker: "RZTR11", nome: "Riza Terrax",         cotas: 280, custoMedio: 102.80, precoAtual: 108.20, dyPorCota: 0.70, aportes: 4 },
    { ticker: "SNCI11", nome: "Suno Capital II",     cotas: 200, custoMedio: 99.50,  precoAtual: 95.30,  dyPorCota: 0.68, aportes: 2 },
    { ticker: "SNAG11", nome: "Suno Agro",           cotas: 150, custoMedio: 108.00, precoAtual: 98.50,  dyPorCota: 0.71, aportes: 2 },
    { ticker: "RZAK11", nome: "Riza Akin",           cotas: 100, custoMedio: 98.20,  precoAtual: 102.40, dyPorCota: 0.69, aportes: 1 },
    { ticker: "KNCR11", nome: "Kinea Recebíveis",    cotas: 180, custoMedio: 112.50, precoAtual: 114.80, dyPorCota: 0.73, aportes: 3 },
  ];

  const ref = new Date(2026, 4, 1);
  const proventos = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const row = { mes: getMesLabel(d) };
    fiisBase.forEach(fii => {
      const v = 0.88 + Math.random() * 0.24;
      row[fii.ticker] = parseFloat((fii.cotas * fii.dyPorCota * v).toFixed(2));
    });
    row.totalMes = parseFloat(fiisBase.reduce((s, f) => s + row[f.ticker], 0).toFixed(2));
    proventos.push(row);
  }

  let acc = 0;
  proventos.forEach(m => { acc += m.totalMes; m.acumulado = parseFloat(acc.toFixed(2)); });

  const fiis = fiisBase.map((fii, i) => {
    const totalDY  = proventos.reduce((s, m) => s + (m[fii.ticker] || 0), 0);
    const investido  = fii.cotas * fii.custoMedio;
    const valorAtual = fii.cotas * fii.precoAtual;
    const retornoTotal = ((valorAtual + totalDY - investido) / investido) * 100;
    const sparkline = proventos.slice(-12).map(m => ({ mes: m.mes, valor: m[fii.ticker] || 0 }));
    const ultimoDY  = { valor: fii.dyPorCota, data: "15/05/2026" };
    const cor = getFiiColor(fii.ticker, i);
    return { ...fii, totalDY, investido, valorAtual, retornoTotal, sparkline, ultimoDY, cor };
  });

  const totalInvestido  = fiis.reduce((s, f) => s + f.investido, 0);
  const valorAtualTotal = fiis.reduce((s, f) => s + f.valorAtual, 0);
  const dividendosTotal = acc;
  const retornoComDY = ((valorAtualTotal + dividendosTotal - totalInvestido) / totalInvestido) * 100;
  const retornoSemDY = ((valorAtualTotal - totalInvestido) / totalInvestido) * 100;

  return {
    fiis,
    proventos,
    resumo: { totalInvestido, valorAtualTotal, dividendosTotal, retornoComDY, retornoSemDY },
  };
}

// ── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const bars = payload.filter(p => p.dataKey !== "acumulado" && (p.value || 0) > 0);
  const total = bars.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={{
      background: "#0d1318", border: "1px solid #2a2a2a",
      padding: "12px 16px", minWidth: 190, borderRadius: 6,
    }}>
      <div style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: 10,
        color: "#5a6a7a", marginBottom: 10, letterSpacing: "0.1em",
      }}>{label}</div>
      {bars.map(p => (
        <div key={p.dataKey} style={{
          display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 5,
          fontFamily: "JetBrains Mono, monospace", fontSize: 11,
        }}>
          <span style={{ color: p.fill }}>{p.dataKey}</span>
          <span style={{ color: "#e8e4dc" }}>R$ {(p.value || 0).toFixed(2)}</span>
        </div>
      ))}
      <div style={{
        borderTop: "1px solid #2a2a2a", marginTop: 8, paddingTop: 8,
        display: "flex", justifyContent: "space-between",
        fontFamily: "JetBrains Mono, monospace", fontSize: 11,
      }}>
        <span style={{ color: "#5a6a7a" }}>Total</span>
        <span style={{ color: "#e8e4dc", fontWeight: 600 }}>R$ {total.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── HEADER SUMMARY ──────────────────────────────────────────────────────────────
function HeaderSummary({ resumo }) {
  const cards = [
    { label: "Total Investido",       value: fmtBRL(resumo.totalInvestido),    color: "#e8e4dc" },
    { label: "Valor Atual",           value: fmtBRL(resumo.valorAtualTotal),   color: "#e8e4dc" },
    { label: "Dividendos Recebidos",  value: fmtBRL(resumo.dividendosTotal),   color: "#d4a94a" },
    {
      label: "Retorno c/ DY",
      value: fmtPct(resumo.retornoComDY),
      color: resumo.retornoComDY >= 0 ? "#4ade80" : "#f87171",
    },
    {
      label: "Retorno s/ DY",
      value: fmtPct(resumo.retornoSemDY),
      color: resumo.retornoSemDY >= 0 ? "#4ade80" : "#f87171",
    },
  ];

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
      gap: 1, background: "#1e2a35", border: "1px solid rgba(255,255,255,0.06)",
      marginBottom: 28,
    }}>
      {cards.map(c => (
        <div key={c.label} style={{ background: "#0d1318", padding: "18px 20px" }}>
          <div style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: 9,
            color: "#5a6a7a", letterSpacing: "0.15em",
            textTransform: "uppercase", marginBottom: 6,
          }}>{c.label}</div>
          <div style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: 18,
            fontWeight: 600, color: c.color, letterSpacing: "0.01em",
          }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── CHART SECTION ───────────────────────────────────────────────────────────────
function ChartSection({ proventos, fiis, activeFiis, onToggleFii, onSync, syncing, acumulado }) {
  return (
    <div style={{
      background: "#0d1318", border: "1px solid rgba(255,255,255,0.06)",
      padding: "24px 24px 20px", marginBottom: 28,
    }}>
      {/* Title row */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.02em" }}>
          Proventos Mensais
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#d4a94a",
          }}>
            Acumulado: {fmtBRL(acumulado)}
          </div>
          <button
            onClick={onSync}
            disabled={syncing}
            style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: 10,
              letterSpacing: "0.1em", padding: "5px 12px",
              background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
              color: "#5a6a7a", cursor: "pointer",
              opacity: syncing ? 0.5 : 1, transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#e8e4dc"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#5a6a7a"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          >
            {syncing ? "..." : "↺ Atualizar"}
          </button>
        </div>
      </div>

      {/* FII filter chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {fiis.map(fii => {
          const isActive = activeFiis.includes(fii.ticker);
          return (
            <button
              key={fii.ticker}
              onClick={() => onToggleFii(fii.ticker)}
              style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: 10,
                letterSpacing: "0.08em", padding: "5px 13px",
                cursor: "pointer", borderRadius: 999,
                border: `1px solid ${isActive ? fii.cor : "#333"}`,
                background: isActive ? fii.cor + "33" : "#1a1a1a",
                color: isActive ? fii.cor : "#444",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                if (!activeFiis.includes(fii.ticker)) {
                  e.currentTarget.style.color = "#666";
                  e.currentTarget.style.borderColor = "#555";
                }
              }}
              onMouseLeave={e => {
                if (!activeFiis.includes(fii.ticker)) {
                  e.currentTarget.style.color = "#444";
                  e.currentTarget.style.borderColor = "#333";
                }
              }}
            >
              {fii.ticker}
            </button>
          );
        })}
      </div>

      {/* Stacked bar + cumulative line */}
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={proventos} margin={{ top: 4, right: 56, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2430" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fill: "#5a6a7a", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
              axisLine={{ stroke: "#1e2a35" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "#5a6a7a", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `R$${v}`}
              width={54}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#ffffff33", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
              width={44}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />

            {fiis.map(fii =>
              activeFiis.includes(fii.ticker) ? (
                <Bar
                  key={fii.ticker}
                  dataKey={fii.ticker}
                  stackId="stack"
                  fill={fii.cor}
                  yAxisId="left"
                  maxBarSize={32}
                />
              ) : null
            )}

            <Line
              type="monotone"
              dataKey="acumulado"
              yAxisId="right"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 3"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── FII CARD ─────────────────────────────────────────────────────────────────────
function FiiCard({ fii }) {
  const retornoColor = fii.retornoTotal >= 0 ? "#4ade80" : "#f87171";
  const retornoWidth = Math.min(Math.abs(fii.retornoTotal) * 3.5, 100);

  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderLeft: `3px solid ${fii.cor}`,
        borderRadius: 10,
        padding: 20,
        transition: "background 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#202020"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#1a1a1a"; }}
    >
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: fii.cor, flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.02em" }}>
            {fii.ticker}
          </div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{fii.nome}</div>
        </div>
      </div>

      {/* Metrics 2×2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Investido",     value: fmtBRL(fii.investido),      color: "#e8e4dc" },
          { label: "Valor Atual",   value: fmtBRL(fii.valorAtual),     color: "#e8e4dc" },
          { label: "DY Acumulado",  value: fmtBRL(fii.totalDY),        color: "#d4a94a" },
          { label: "Retorno Total", value: fmtPct(fii.retornoTotal),   color: retornoColor },
        ].map(m => (
          <div key={m.label} style={{ background: "#121920", padding: "10px 12px", borderRadius: 4 }}>
            <div style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: 8,
              color: "#5a6a7a", letterSpacing: "0.12em",
              textTransform: "uppercase", marginBottom: 4,
            }}>{m.label}</div>
            <div style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: 12,
              fontWeight: 600, color: m.color,
            }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Return progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 9,
          color: "#5a6a7a", letterSpacing: "0.1em",
          textTransform: "uppercase", marginBottom: 6,
        }}>
          Retorno c/ DY:{" "}
          <span style={{ color: retornoColor }}>{fmtPct(fii.retornoTotal)}</span>
        </div>
        <div style={{ height: 4, background: "#0d1318", borderRadius: 2 }}>
          <div style={{
            height: "100%",
            width: `${retornoWidth}%`,
            background: retornoColor,
            borderRadius: 2,
            transition: "width 0.8s ease",
          }} />
        </div>
      </div>

      {/* Sparkline — últimos 12 meses */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 8,
          color: "#5a6a7a", letterSpacing: "0.12em",
          textTransform: "uppercase", marginBottom: 6,
        }}>Últimos 12 meses</div>
        <div style={{ height: 48 }}>
          <ResponsiveContainer width="100%" height={48}>
            <BarChart data={fii.sparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Bar dataKey="valor" fill={fii.cor} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid #2a2a2a", paddingTop: 12,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 6,
      }}>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#5a6a7a" }}>
          Último DY:{" "}
          <span style={{ color: "#d4a94a" }}>
            R$ {fii.ultimoDY?.valor?.toFixed(2)}/cota
          </span>
          {fii.ultimoDY?.data && (
            <span style={{ color: "#333" }}> em {fii.ultimoDY.data}</span>
          )}
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#333" }}>
          {fii.aportes} {fii.aportes === 1 ? "aporte" : "aportes"}
        </div>
      </div>
    </div>
  );
}

// ── MAIN EXPORT ──────────────────────────────────────────────────────────────────
export default function Rentabilidade({ apiUrl }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeFiis, setActiveFiis] = useState(null);
  const [syncing, setSyncing]     = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, resumoRes, rentRes] = await Promise.allSettled([
        fetch(`${apiUrl}/fiis/proventos`).then(r => r.ok ? r.json() : Promise.reject()),
        fetch(`${apiUrl}/fiis/proventos/resumo`).then(r => r.ok ? r.json() : Promise.reject()),
        fetch(`${apiUrl}/fiis/rentabilidade`).then(r => r.ok ? r.json() : Promise.reject()),
      ]);

      if (
        provRes.status === "fulfilled" &&
        resumoRes.status === "fulfilled" &&
        rentRes.status === "fulfilled"
      ) {
        // Real API data available — transform here when backend is ready
        setData(gerarDemoData());
      } else {
        setData(gerarDemoData());
      }
    } catch {
      setData(gerarDemoData());
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (data && activeFiis === null) {
      setActiveFiis(data.fiis.map(f => f.ticker));
    }
  }, [data, activeFiis]);

  const toggleFii = useCallback((ticker) => {
    setActiveFiis(prev => {
      if (!prev) return prev;
      if (prev.includes(ticker)) {
        return prev.length > 1 ? prev.filter(t => t !== ticker) : prev;
      }
      return [...prev, ticker];
    });
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`${apiUrl}/fiis/proventos/sync`, { method: "POST" }).catch(() => {});
      await fetchData();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 32px" }}>
        <div style={{
          width: 40, height: 40, border: "3px solid #1e2a35",
          borderTopColor: "#d4a94a", borderRadius: "50%",
          animation: "spin 0.8s linear infinite", margin: "0 auto 20px",
        }} />
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#5a6a7a",
        }}>
          Carregando rentabilidade...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { fiis, proventos, resumo } = data;
  const currentActiveFiis = activeFiis ?? fiis.map(f => f.ticker);

  return (
    <div style={{ animation: "fadeUp 0.35s ease both" }}>
      <HeaderSummary resumo={resumo} />

      <ChartSection
        proventos={proventos}
        fiis={fiis}
        activeFiis={currentActiveFiis}
        onToggleFii={toggleFii}
        onSync={handleSync}
        syncing={syncing}
        acumulado={resumo.dividendosTotal}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 16,
      }}>
        {fiis.map(fii => <FiiCard key={fii.ticker} fii={fii} />)}
      </div>
    </div>
  );
}
