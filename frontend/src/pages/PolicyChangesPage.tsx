import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const severityStyles: Record<string, { badge: string; dot: string }> = {
  Clinical: { badge: "bg-red-50 text-red-700", dot: "bg-red-500" },
  Notable: { badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  Moderate: { badge: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  Minor: { badge: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
};

export default function PolicyChangesPage() {
  const [filter, setFilter] = useState<string>("all");

  const { data: changes, isLoading } = useQuery({
    queryKey: ["policies", "changes"],
    queryFn: () => api.policies.changes(100),
    staleTime: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["policies", "changes", "stats"],
    queryFn: api.policies.changesStats,
    staleTime: 60_000,
  });

  const filteredChanges = changes?.filter((c) => {
    if (filter === "all") return true;
    return c.severity === filter;
  });

  const statCards = [
    {
      l: "Total Changes",
      v: stats?.total_changes?.toString() ?? "—",
      d: `${stats?.policies_with_changes ?? 0} policies`,
      c: "primary" as const,
    },
    {
      l: "Clinical Updates",
      v: stats?.clinical_updates?.toString() ?? "—",
      d: "Criteria changes",
      c: "error" as const,
    },
    {
      l: "Coding Updates",
      v: stats?.coding_updates?.toString() ?? "—",
      d: "HCPCS & formatting",
      c: "slate" as const,
    },
    {
      l: "Payers Tracked",
      v: stats?.policies_with_changes?.toString() ?? "—",
      d: "With change history",
      c: "tertiary" as const,
    },
  ];

  // Group changes by date for timeline
  const grouped = new Map<string, typeof filteredChanges>();
  for (const change of filteredChanges || []) {
    const key = change.change_date || "Unknown Date";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(change);
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
            Policy Changes
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Track clinical and administrative modifications across all indexed payer policies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {["all", "Clinical", "Notable", "Moderate", "Minor"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? "bg-[#0EA5A0] text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-10">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl whisper-shadow border border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              {stat.l}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold font-headline">{stat.v}</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  stat.c === "error"
                    ? "bg-red-50 text-red-700"
                    : stat.c === "primary"
                    ? "bg-teal-50 text-[#0EA5A0]"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {stat.d}
              </span>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5A0]" />
          <span className="ml-3 text-slate-500">Loading changes...</span>
        </div>
      ) : (
        <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-px before:bg-slate-200">
          {Array.from(grouped.entries()).map(([dateKey, items]) => (
            <div key={dateKey} className="relative pl-12">
              <div className="absolute left-0 top-1 w-10 h-10 bg-[#F7F8FA] flex items-center justify-center rounded-full border-2 border-white z-10">
                <div className="w-3 h-3 bg-[#0EA5A0] rounded-full" />
              </div>
              <div className="mb-4">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  {dateKey}
                </span>
              </div>

              <div className="space-y-4">
                {items!.map((change, idx) => {
                  const styles = severityStyles[change.severity] || severityStyles.Minor;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-xl whisper-shadow border border-slate-100 overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`${styles.badge} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}
                            >
                              {change.severity}
                            </span>
                            <h3 className="text-sm font-bold text-on-surface">
                              {change.payer}
                            </h3>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                            {change.policy_title?.slice(0, 40) || "Policy"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {change.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredChanges && filteredChanges.length === 0 && (
            <div className="text-center py-20 pl-12">
              <span className="material-symbols-outlined text-slate-300 text-5xl mb-4">
                history
              </span>
              <p className="text-slate-500 text-lg">No changes found for this filter</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
