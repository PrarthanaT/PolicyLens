import { useState, useRef, type DragEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { IngestResult } from "../lib/types";

export default function IngestPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [payerHint, setPayerHint] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["ingest", "status"],
    queryFn: api.ingest.status,
    staleTime: 30_000,
  });

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported");
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.ingest.upload(file, payerHint);
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ["ingest"] });
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-10">
        <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
          Ingest Policies
        </h2>
        <p className="text-slate-500 mt-2 text-lg">
          Upload medical policy PDFs to automatically extract structured drug coverage data using AI.
        </p>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { l: "Policies Indexed", v: status?.total_policies ?? "—" },
          { l: "Drugs Extracted", v: status?.total_drugs?.toLocaleString() ?? "—" },
          { l: "Payers Covered", v: status?.total_payers ?? "—" },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-teal-50 flex items-center justify-center rounded-lg">
              <span className="material-symbols-outlined text-[#0EA5A0]">
                {i === 0 ? "description" : i === 1 ? "medication" : "business"}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.l}</p>
              <span className="text-2xl font-semibold text-slate-900">{s.v}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Upload area */}
        <div className="md:col-span-2 bg-white rounded-xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 flex items-center justify-center rounded-lg">
                <span className="material-symbols-outlined text-[#0EA5A0]">upload_file</span>
              </div>
              <h3 className="font-semibold text-lg">Upload Policy Document</h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
              PDF Only
            </span>
          </div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center group cursor-pointer transition-all ${
              isDragging
                ? "border-[#0EA5A0] bg-teal-50/30"
                : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#0EA5A0]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5A0] mb-4" />
                <p className="text-on-surface font-medium">Processing document with AI...</p>
                <p className="text-slate-400 text-sm mt-1">Extracting drugs, criteria, and coverage data</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[#0EA5A0] text-3xl">add</span>
                </div>
                <p className="text-on-surface font-medium text-center">
                  Drag and drop a policy PDF here
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  or{" "}
                  <span className="text-[#0EA5A0] font-semibold underline decoration-2 underline-offset-4">
                    browse files
                  </span>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Payer hint + info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-teal-50 flex items-center justify-center rounded-lg">
                <span className="material-symbols-outlined text-[#0EA5A0] text-xl">business</span>
              </div>
              <h3 className="font-semibold">Payer Hint</h3>
            </div>
            <p className="text-slate-500 text-sm mb-4">
              Optionally provide the payer name to improve extraction accuracy.
            </p>
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#0EA5A0] outline-none transition-all"
              placeholder="e.g., UnitedHealthcare"
              type="text"
              value={payerHint}
              onChange={(e) => setPayerHint(e.target.value)}
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
            <h4 className="text-sm font-bold text-slate-700 mb-3">AI Extraction Capabilities</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              {[
                "Drug names & HCPCS codes",
                "Prior auth criteria",
                "Step therapy requirements",
                "Site-of-care restrictions",
                "Covered indications",
                "Dosing limits",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0EA5A0] text-base">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Result / Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600">error</span>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-[#0EA5A0] text-2xl">task_alt</span>
            <h3 className="text-lg font-bold text-slate-900">Ingestion Complete</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: "Payer", v: result.payer },
              { l: "Policy", v: result.policy_title },
              { l: "Drugs Extracted", v: result.drugs_extracted.toString() },
              { l: "Text Processed", v: `${(result.text_length / 1000).toFixed(1)}k chars` },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-lg p-4">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{s.l}</p>
                <p className="text-sm font-semibold text-slate-900 truncate">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent ingestions */}
      {status?.recent_ingestions && status.recent_ingestions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-slate-700">Recently Ingested Policies</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-slate-400 font-bold bg-slate-50">
                <th className="px-6 py-3">Source File</th>
                <th className="px-6 py-3">Payer</th>
                <th className="px-6 py-3">Policy Title</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {status.recent_ingestions.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">picture_as_pdf</span>
                      <span className="font-mono text-xs">{item.source_filename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{item.payer}</td>
                  <td className="px-6 py-4 text-slate-500 truncate max-w-[300px]">{item.policy_title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
