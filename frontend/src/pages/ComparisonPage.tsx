import { useState, type FormEvent } from "react";
import { useComparison, useCompareSummary } from "../hooks/useComparison";
import type { PayerComparison, SummaryMetric } from "../lib/types";

function formatBool(val: number | null, yesLabel = "Required", noLabel = "Not Required") {
  if (val === 1) return yesLabel;
  if (val === 0) return noLabel;
  return "—";
}

function truncate(str: string | null, max = 120) {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

interface FactorRow {
  label: string;
  type: "badge" | "status" | "mono" | "icon-text" | "text" | "mono-bold";
  extract: (p: PayerComparison) => string;
}

const factorRows: FactorRow[] = [
  {
    label: "Coverage Status",
    type: "badge",
    extract: (p) => p.access_status_group?.toUpperCase().replace(/_/g, " ") ?? "COVERED",
  },
  {
    label: "Prior Auth",
    type: "status",
    extract: (p) => formatBool(p.prior_auth_required, "REQUIRED", "NOT REQUIRED"),
  },
  {
    label: "Step Therapy",
    type: "mono",
    extract: (p) =>
      p.step_therapy_required === 1
        ? truncate(p.step_therapy_details?.split("||")[0]?.trim() ?? "Required")
        : "None required",
  },
  {
    label: "Site of Care",
    type: "icon-text",
    extract: (p) =>
      p.site_of_care_required === 1
        ? truncate(p.site_of_care_details)
        : "Any Facility",
  },
  {
    label: "Indications",
    type: "text",
    extract: (p) =>
      p.covered_diagnoses
        ? p.covered_diagnoses.slice(0, 3).join(", ") +
          (p.covered_diagnoses.length > 3 ? ` (+${p.covered_diagnoses.length - 3} more)` : "")
        : "—",
  },
  {
    label: "Dosing / Quantity",
    type: "mono-bold",
    extract: (p) => truncate(p.dosing_limit_summary?.split("||")[0]?.trim() ?? null, 80),
  },
];

function CellValue({ type, value }: { type: FactorRow["type"]; value: string }) {
  switch (type) {
    case "badge":
      return (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
            value.includes("NOT")
              ? "bg-error-container/20 text-error"
              : "bg-[#0EA5A0]/10 text-[#0EA5A0]"
          }`}
        >
          {value}
        </span>
      );
    case "status": {
      const color =
        value === "REQUIRED"
          ? "text-[#0EA5A0]"
          : value === "NOT REQUIRED"
          ? "text-slate-400"
          : "text-error";
      const icon =
        value === "REQUIRED"
          ? "check_circle"
          : value === "NOT REQUIRED"
          ? "info"
          : "warning";
      return (
        <div className={`flex items-center gap-2 ${color}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
          <span className="text-xs font-bold">{value}</span>
        </div>
      );
    }
    case "mono":
      return <span className="text-xs font-mono text-slate-600 line-clamp-3">{value}</span>;
    case "icon-text":
      return (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">home</span>
          <span className="text-xs font-medium">{value}</span>
        </div>
      );
    case "text":
      return <span className="text-xs text-slate-600 leading-relaxed line-clamp-3">{value}</span>;
    case "mono-bold":
      return <span className="text-xs font-mono text-slate-900 font-bold line-clamp-2">{value}</span>;
  }
}

function MetricCard({ metric }: { metric: SummaryMetric }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 flex flex-col justify-between">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        {metric.label}
      </span>
      <div className="flex items-baseline gap-2 mt-2">
        <span
          className={`text-4xl font-semibold tracking-tighter ${
            metric.primary ? "text-[#0EA5A0]" : "text-slate-900"
          }`}
        >
          {metric.value}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-container/10 text-[#0EA5A0]">
          {metric.detail}
        </span>
      </div>
    </div>
  );
}

export default function ComparisonPage() {
  const [query, setQuery] = useState("");
  const [drugName, setDrugName] = useState("");

  const { data: payers, isLoading } = useComparison(drugName);
  const { data: summary } = useCompareSummary(drugName);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) setDrugName(query.trim());
  }

  const colCount = (payers?.length ?? 0) + 1;

  return (
    <div className="p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <div>
            <nav className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-medium">
              <span>Clinical Analytics</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>Payer Comparison</span>
            </nav>
            {drugName ? (
              <h2 className="text-4xl font-extrabold font-headline tracking-tight text-slate-900 capitalize">
                {drugName}
              </h2>
            ) : (
              <h2 className="text-4xl font-extrabold font-headline tracking-tight text-slate-900">
                Payer Comparison
              </h2>
            )}
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">download</span> Export Analysis
            </button>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="max-w-xl">
          <div className="bg-white rounded-xl whisper-shadow p-1.5 flex items-center border border-slate-100">
            <span className="material-symbols-outlined text-[#0EA5A0] mx-3 text-xl">
              compare_arrows
            </span>
            <input
              className="flex-1 border-none focus:ring-0 text-base font-medium placeholder-slate-400 py-2.5"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter drug name to compare across payers..."
              type="text"
            />
            <button
              type="submit"
              className="bg-[#0EA5A0] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 transition-all active:scale-95"
            >
              Compare
            </button>
          </div>
        </form>

        {/* Summary metrics */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.values(summary).map((m, i) => (
              <MetricCard key={i} metric={m} />
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5A0]" />
          <span className="ml-3 text-slate-500">Loading comparison data...</span>
        </div>
      )}

      {/* Empty state */}
      {!drugName && !isLoading && (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-slate-200 text-6xl mb-4">
            compare_arrows
          </span>
          <p className="text-slate-400 text-lg">
            Search for a drug to compare coverage across payers
          </p>
        </div>
      )}

      {payers && payers.length === 0 && (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-slate-300 text-5xl mb-4">search_off</span>
          <p className="text-slate-500 text-lg">No payer data found for "{drugName}"</p>
        </div>
      )}

      {/* Comparison table */}
      {payers && payers.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-xl bg-white border border-slate-100 shadow-sm overflow-x-auto">
          {/* Header */}
          <div
            className="grid bg-slate-900 text-white"
            style={{ gridTemplateColumns: `minmax(180px, 1fr) repeat(${payers.length}, minmax(200px, 1fr))` }}
          >
            <div className="p-6 flex items-center font-bold text-sm border-r border-white/5">
              COMPARISON FACTORS
            </div>
            {payers.map((payer, idx) => (
              <div
                key={payer.payer}
                className="p-6 flex flex-col gap-1 border-r border-white/5 last:border-0"
              >
                <span className="text-[10px] text-[#0EA5A0] font-black tracking-widest uppercase">
                  Payer {String(idx + 1).padStart(2, "0")}
                </span>
                <h4 className="font-bold text-lg leading-tight">{payer.payer}</h4>
                <p className="text-xs text-slate-400 truncate" title={payer.policy_title}>
                  {payer.policy_title || "—"}
                </p>
              </div>
            ))}
          </div>

          {/* Rows */}
          {factorRows.map((f, i) => (
            <div
              key={f.label}
              className={`grid group hover:bg-[#F7F8FA] transition-colors ${
                i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
              }`}
              style={{ gridTemplateColumns: `minmax(180px, 1fr) repeat(${payers.length}, minmax(200px, 1fr))` }}
            >
              <div className="p-6 flex items-center font-semibold text-sm text-slate-500">
                {f.label}
              </div>
              {payers.map((payer) => (
                <div key={payer.payer} className="p-6 border-l border-slate-100">
                  <CellValue type={f.type} value={f.extract(payer)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
