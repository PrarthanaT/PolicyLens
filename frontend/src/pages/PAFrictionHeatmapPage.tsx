import { useState } from "react";

type ViewType = "friction" | "step" | "time";

interface HeatmapCell {
  v: number;
  l: string;
  c: string;
  na?: boolean;
}

interface HeatmapRow {
  name: string;
  cells: HeatmapCell[];
}

interface Insight {
  icon: string;
  iconColor: string;
  bgColor: string;
  title: string;
  text: string;
}

interface ViewData {
  title: string;
  subtitle: string;
  description: string;
  insights: Insight[];
  rows: HeatmapRow[];
}

const drugColumns = [
  "Rituximab",
  "Humira",
  "Keytruda",
  "Dupixent",
  "Skyrizi",
  "Zolgensma",
  "Ozempic",
];

const data: Record<ViewType, ViewData> = {
  friction: {
    title: "PA Friction Score",
    subtitle: "How hard is it to actually get this drug approved?",
    description: "Score 1-10 per payer. The full friction spectrum.",
    insights: [
      {
        icon: "lightbulb",
        iconColor: "text-white",
        bgColor: "bg-[#0EA5A0]",
        title: "Critical Friction Alert",
        text: "<strong>Zolgensma</strong> exhibits extreme friction (9.0+) across 60% of tracked payers. This suggests systemic prior authorization hurdles beyond typical gene therapy requirements.",
      },
      {
        icon: "trending_up",
        iconColor: "text-white",
        bgColor: "bg-[#3c6563]",
        title: "Best Path Analysis",
        text: "<strong>UHC Commercial</strong> shows the lowest overall friction for Rheumatology drugs, specifically Rituximab, outperforming the market average by 22%.",
      },
      {
        icon: "gpp_maybe",
        iconColor: "text-white",
        bgColor: "bg-error",
        title: "Protocol Divergence",
        text: "High divergence noted in <strong>Humira</strong> policy requirements between Cigna and BCBS Michigan, affecting step-therapy order for adalimumab biosimilars.",
      },
    ],
    rows: [
      {
        name: "UHC Commercial",
        cells: [
          { v: 3, l: "Low PA", c: "#16a34a" },
          { v: 7, l: "High PA", c: "#ea580c" },
          { v: 2, l: "None", c: "#166534" },
          { v: 5, l: "Med PA", c: "#ca8a04" },
          { v: 2, l: "None", c: "#166534" },
          { v: 9, l: "Restrictive", c: "#b91c1c" },
          { v: 8, l: "Excl Pref", c: "#ea580c" },
        ],
      },
      {
        name: "Cigna Global Health",
        cells: [
          { v: 4, l: "Low PA", c: "#16a34a" },
          { v: 8, l: "High PA", c: "#ea580c" },
          { v: 3, l: "None", c: "#16a34a" },
          { v: 4, l: "Med PA", c: "#16a34a" },
          { v: 1, l: "None", c: "#166534" },
          { v: 8, l: "Restrictive", c: "#ea580c" },
          { v: 9, l: "Excl Pref", c: "#b91c1c" },
        ],
      },
      {
        name: "Aetna Medicare Adv.",
        cells: [
          { v: 6, l: "Med PA", c: "#ca8a04" },
          { v: 6, l: "Med PA", c: "#ca8a04" },
          { v: 4, l: "Low PA", c: "#16a34a" },
          { v: 7, l: "High PA", c: "#ea580c" },
          { v: 5, l: "Med PA", c: "#ca8a04" },
          { v: 7, l: "High PA", c: "#ea580c" },
          { v: 10, l: "Not Cov.", c: "#b91c1c" },
        ],
      },
      {
        name: "BCBS Michigan",
        cells: [
          { v: 7, l: "High PA", c: "#ea580c" },
          { v: 5, l: "Med PA", c: "#ca8a04" },
          { v: 8, l: "Excl Pref", c: "#ea580c" },
          { v: 6, l: "Med PA", c: "#ca8a04" },
          { v: 6, l: "Med PA", c: "#ca8a04" },
          { v: 9, l: "Restrictive", c: "#b91c1c" },
          { v: 9, l: "Not Cov.", c: "#b91c1c" },
        ],
      },
      {
        name: "UPMC Health Plan",
        cells: [
          { v: 3, l: "Low PA", c: "#16a34a" },
          { v: 6, l: "Med PA", c: "#ca8a04" },
          { v: 3, l: "None", c: "#16a34a" },
          { v: 5, l: "Med PA", c: "#ca8a04" },
          { v: 3, l: "None", c: "#16a34a" },
          { v: 8, l: "High PA", c: "#ea580c" },
          { v: 7, l: "Excl Pref", c: "#ea580c" },
        ],
      },
      {
        name: "Priority Health",
        cells: [
          { v: 5, l: "Med PA", c: "#ca8a04" },
          { v: 7, l: "High PA", c: "#ea580c" },
          { v: 4, l: "Low PA", c: "#16a34a" },
          { v: 6, l: "Med PA", c: "#ca8a04" },
          { v: 4, l: "Low PA", c: "#16a34a" },
          { v: 8, l: "High PA", c: "#ea580c" },
          { v: 8, l: "Excl Pref", c: "#ea580c" },
        ],
      },
    ],
  },
  step: {
    title: "Step Therapy Burden",
    subtitle:
      "How many drugs must a patient try and fail before this drug is approved?",
    description:
      "How many drugs must a patient try and fail before this drug is approved? (0 = none required)",
    insights: [
      {
        icon: "priority_high",
        iconColor: "text-white",
        bgColor: "bg-error",
        title: "Highest Burden",
        text: "Aetna Medicare Adv. requires up to 3 step therapy drugs before approving Dupixent — the highest burden of any indexed payer.",
      },
      {
        icon: "check_circle",
        iconColor: "text-white",
        bgColor: "bg-[#166534]",
        title: "Lowest Burden",
        text: "UPMC Health Plan requires zero step therapy for 5 of 7 indexed drugs — most permissive pathway.",
      },
      {
        icon: "biotech",
        iconColor: "text-white",
        bgColor: "bg-[#0EA5A0]",
        title: "Key Finding",
        text: "Dupixent has the highest average step therapy burden (1.5 drugs) across all payers — driven by IL-4/IL-13 class management policies.",
      },
    ],
    rows: [
      {
        name: "UHC Commercial",
        cells: [
          { v: 1, l: "ONE DMARD", c: "#ca8a04" },
          { v: 1, l: "DMARD REQ", c: "#ca8a04" },
          { v: 0, l: "NONE", c: "#166534" },
          { v: 1, l: "ONE STEP", c: "#ca8a04" },
          { v: 0, l: "NONE", c: "#166534" },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
        ],
      },
      {
        name: "Cigna Global Health",
        cells: [
          { v: 1, l: "BIOSIMILAR", c: "#ca8a04" },
          { v: 2, l: "TWO STEP", c: "#ea580c" },
          { v: 0, l: "NONE", c: "#166534" },
          { v: 2, l: "TWO STEP", c: "#ea580c" },
          { v: 0, l: "NONE", c: "#166534" },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
        ],
      },
      {
        name: "Aetna Medicare Adv.",
        cells: [
          { v: 2, l: "TWO STEP", c: "#ea580c" },
          { v: 2, l: "TWO STEP", c: "#ea580c" },
          { v: 1, l: "ONE STEP", c: "#ca8a04" },
          { v: 3, l: "THREE STEP", c: "#b91c1c" },
          { v: 1, l: "ONE STEP", c: "#ca8a04" },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
        ],
      },
      {
        name: "BCBS Michigan",
        cells: [
          { v: 2, l: "TWO STEP", c: "#ea580c" },
          { v: 2, l: "TWO STEP", c: "#ea580c" },
          { v: 2, l: "TWO STEP", c: "#ea580c" },
          { v: 2, l: "TWO STEP", c: "#ea580c" },
          { v: 1, l: "ONE STEP", c: "#ca8a04" },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
        ],
      },
      {
        name: "UPMC Health Plan",
        cells: [
          { v: 0, l: "NONE", c: "#166534" },
          { v: 0, l: "NONE", c: "#166534" },
          { v: 0, l: "NONE", c: "#166534" },
          { v: 1, l: "ONE STEP", c: "#ca8a04" },
          { v: 0, l: "NONE", c: "#166534" },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
        ],
      },
      {
        name: "Priority Health",
        cells: [
          { v: 1, l: "ONE STEP", c: "#ca8a04" },
          { v: 1, l: "ONE STEP", c: "#ca8a04" },
          { v: 1, l: "ONE STEP", c: "#ca8a04" },
          { v: 2, l: "TWO STEP", c: "#ea580c" },
          { v: 1, l: "ONE STEP", c: "#ca8a04" },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
          { v: 0, l: "N/A", c: "#f1f5f9", na: true },
        ],
      },
    ],
  },
  time: {
    title: "Approval Time (days)",
    subtitle:
      "Average calendar days from PA submission to approval decision at each payer",
    description:
      "Average calendar days from PA submission to approval decision at each payer",
    insights: [
      {
        icon: "speed",
        iconColor: "text-white",
        bgColor: "bg-[#166534]",
        title: "Fastest Payer",
        text: "UHC Commercial has the fastest average approval time at 14.7 days — driven by streamlined PA processes for oncology and immunology drugs.",
      },
      {
        icon: "timer_off",
        iconColor: "text-white",
        bgColor: "bg-error",
        title: "Slowest",
        text: "Ozempic at Aetna takes 50 days on average and is denied in most cases — weight management indication effectively blocked.",
      },
      {
        icon: "analytics",
        iconColor: "text-white",
        bgColor: "bg-[#0EA5A0]",
        title: "Key Finding",
        text: "Zolgensma averages 42 days across all payers due to clinical complexity and cost review requirements — plan for 6+ weeks minimum.",
      },
    ],
    rows: [
      {
        name: "UHC Commercial",
        cells: [
          { v: 4, l: "FAST", c: "#166534" },
          { v: 12, l: "MODERATE", c: "#ca8a04" },
          { v: 2, l: "FAST", c: "#166534" },
          { v: 7, l: "MODERATE", c: "#16a34a" },
          { v: 2, l: "FAST", c: "#166534" },
          { v: 45, l: "SLOW", c: "#b91c1c" },
          { v: 30, l: "SLOW", c: "#b91c1c" },
        ],
      },
      {
        name: "Cigna Global Health",
        cells: [
          { v: 5, l: "FAST", c: "#166534" },
          { v: 14, l: "MODERATE", c: "#ca8a04" },
          { v: 3, l: "FAST", c: "#166534" },
          { v: 6, l: "MODERATE", c: "#16a34a" },
          { v: 3, l: "FAST", c: "#166534" },
          { v: 40, l: "SLOW", c: "#b91c1c" },
          { v: 45, l: "SLOW", c: "#b91c1c" },
        ],
      },
      {
        name: "Aetna Medicare Adv.",
        cells: [
          { v: 8, l: "MODERATE", c: "#16a34a" },
          { v: 21, l: "SLOW", c: "#ea580c" },
          { v: 6, l: "MODERATE", c: "#16a34a" },
          { v: 14, l: "MODERATE", c: "#ca8a04" },
          { v: 7, l: "MODERATE", c: "#16a34a" },
          { v: 42, l: "SLOW", c: "#b91c1c" },
          { v: 50, l: "VERY SLOW", c: "#b91c1c" },
        ],
      },
      {
        name: "BCBS Michigan",
        cells: [
          { v: 10, l: "MODERATE", c: "#16a34a" },
          { v: 18, l: "SLOW", c: "#ea580c" },
          { v: 14, l: "MODERATE", c: "#ca8a04" },
          { v: 10, l: "MODERATE", c: "#16a34a" },
          { v: 9, l: "MODERATE", c: "#16a34a" },
          { v: 45, l: "SLOW", c: "#b91c1c" },
          { v: 45, l: "SLOW", c: "#b91c1c" },
        ],
      },
      {
        name: "UPMC Health Plan",
        cells: [
          { v: 4, l: "FAST", c: "#166534" },
          { v: 9, l: "MODERATE", c: "#16a34a" },
          { v: 4, l: "FAST", c: "#166534" },
          { v: 8, l: "MODERATE", c: "#16a34a" },
          { v: 4, l: "FAST", c: "#166534" },
          { v: 40, l: "SLOW", c: "#b91c1c" },
          { v: 35, l: "SLOW", c: "#b91c1c" },
        ],
      },
      {
        name: "Priority Health",
        cells: [
          { v: 7, l: "MODERATE", c: "#16a34a" },
          { v: 12, l: "MODERATE", c: "#ca8a04" },
          { v: 6, l: "MODERATE", c: "#16a34a" },
          { v: 9, l: "MODERATE", c: "#16a34a" },
          { v: 6, l: "MODERATE", c: "#16a34a" },
          { v: 42, l: "SLOW", c: "#b91c1c" },
          { v: 38, l: "SLOW", c: "#b91c1c" },
        ],
      },
    ],
  },
};

const viewButtons: { key: ViewType; label: string }[] = [
  { key: "friction", label: "PA Friction Score" },
  { key: "step", label: "Step Therapy Burden" },
  { key: "time", label: "Approval Time (days)" },
];

function HeatmapCell({ cell }: { cell: HeatmapCell }) {
  const textColor = cell.c === "#f1f5f9" ? "text-slate-400" : "text-white";
  return (
    <td className="p-0">
      <div
        className="heatmap-cell rounded-md flex flex-col items-center justify-center cursor-pointer mx-auto shadow-sm"
        style={{ backgroundColor: cell.c }}
      >
        <span className={`text-sm font-bold ${textColor}`}>{cell.v}</span>
        <span
          className={`text-[8px] font-bold ${textColor} uppercase text-center leading-none px-1`}
        >
          {cell.l}
        </span>
      </div>
    </td>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="bg-white p-6 rounded-2xl whisper-shadow border border-slate-100">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 ${insight.bgColor} rounded-lg`}>
          <span className={`material-symbols-outlined ${insight.iconColor}`}>
            {insight.icon}
          </span>
        </div>
        <h3 className="font-headline font-bold text-[#003331]">
          {insight.title}
        </h3>
      </div>
      <p
        className="text-sm text-slate-600 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: insight.text }}
      />
    </div>
  );
}

export default function PAFrictionHeatmapPage() {
  const [activeView, setActiveView] = useState<ViewType>("friction");
  const view = data[activeView];

  return (
    <div className="p-8 pb-12 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-medium">
          <span>Analysis</span>
          <span className="material-symbols-outlined text-[14px]">
            chevron_right
          </span>
          <span>PA Friction Heatmap</span>
        </nav>
        <h2 className="text-4xl font-extrabold font-headline tracking-tight text-slate-900 mb-1">
          PA Friction Heatmap
        </h2>
        <p className="text-slate-500 text-lg">{view.subtitle}</p>
      </div>

      {/* Controls */}
      <section className="mb-10 p-6 bg-white rounded-xl whisper-shadow border border-slate-100">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-headline text-[#003331]">
                {view.title}
              </h3>
              <p className="text-slate-500 text-sm">{view.description}</p>
            </div>
            <div className="w-64 hidden md:block">
              <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-1">
                <span>Low</span>
                <span>High</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gradient-to-r from-[#166534] via-[#ca8a04] to-[#b91c1c]" />
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            {viewButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setActiveView(btn.key)}
                className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
                  activeView === btn.key
                    ? "bg-[#0EA5A0] text-white font-semibold shadow-md"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Heatmap Grid */}
      <section className="bg-slate-50 rounded-2xl p-4 overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-x-2 border-spacing-y-3">
            <thead>
              <tr>
                <th className="text-left py-4 px-2 font-headline text-slate-500 font-bold text-[10px] uppercase tracking-widest w-[180px] min-w-[180px]">
                  Payer Name
                </th>
                {drugColumns.map((drug) => (
                  <th
                    key={drug}
                    className="py-4 px-1 font-headline font-semibold text-slate-600 text-xs text-center w-[80px]"
                  >
                    {drug}
                  </th>
                ))}
                <th className="py-4 px-1 font-headline font-bold text-[#0EA5A0] text-[10px] uppercase tracking-widest text-center">
                  Row Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => {
                let total = 0;
                let count = 0;
                row.cells.forEach((cell) => {
                  if (!cell.na) {
                    total += cell.v;
                    count++;
                  }
                });
                const avg = count > 0 ? (total / count).toFixed(1) : "0.0";

                return (
                  <tr key={row.name}>
                    <td className="px-2 py-3 font-headline font-bold text-slate-900 text-sm">
                      {row.name}
                    </td>
                    {row.cells.map((cell, i) => (
                      <HeatmapCell key={i} cell={cell} />
                    ))}
                    <td className="text-center font-bold text-[#0EA5A0] text-sm">
                      {avg}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Insights */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {view.insights.map((insight) => (
          <InsightCard key={insight.title} insight={insight} />
        ))}
      </section>
    </div>
  );
}
