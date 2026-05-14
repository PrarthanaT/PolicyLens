import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function LibraryPage() {
  const { data: policies, isLoading } = useQuery({
    queryKey: ["policies", "list"],
    queryFn: api.policies.list,
    staleTime: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["policies", "stats"],
    queryFn: api.policies.stats,
    staleTime: 60_000,
  });

  const summaryStats = [
    { l: "Total Policies", v: stats?.total_policies?.toString() ?? "—" },
    { l: "Indexed Payers", v: stats?.total_payers?.toString() ?? "—" },
    { l: "Total Drugs Tracked", v: stats?.total_drugs?.toLocaleString() ?? "—" },
    { l: "Latest Indexed", v: stats?.latest_indexed ?? "—" },
  ];

  return (
    <div className="px-8 pb-12">
      <div className="flex justify-between items-end py-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight text-slate-900">
            Policy Library
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Browse and analyze all indexed medical benefit drug policies across payers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {summaryStats.map((s, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between h-32"
          >
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{s.l}</p>
            <span className="text-4xl font-semibold text-slate-900 tracking-tight leading-none">
              {s.v}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5A0]" />
            <span className="ml-3 text-slate-500">Loading policies...</span>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">Payer / Policy</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-center">Drugs</th>
                <th className="px-6 py-4 text-center">PA Required</th>
                <th className="px-6 py-4 text-center">Step Therapy</th>
                <th className="px-6 py-4">Effective Date</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(policies || []).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{p.payer}</span>
                      <span className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-[320px]">
                        {p.policy_title || "Drug List"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                      {p.document_type?.replace(/_/g, " ") || "Policy"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-bold text-slate-900">{p.drug_count}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-mono text-slate-600">{p.pa_drug_count}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-mono text-slate-600">{p.step_therapy_drug_count}</span>
                  </td>
                  <td className="px-6 py-5 font-mono text-[11px] text-slate-500">
                    {p.effective_date || "—"}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-50 text-[#0EA5A0]">
                        Active
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
