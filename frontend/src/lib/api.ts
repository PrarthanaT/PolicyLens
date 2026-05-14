import type {
  DrugSearchResult,
  TrendingDrug,
  PayerComparison,
  CompareSummary,
  CoverageMatrix,
  ChatMessage,
  PolicySummary,
  PolicyStats,
  PolicyChange,
  ChangesStats,
  IngestStatus,
  IngestResult,
} from "./types";

const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  try {
    const res = await fetch(`${BASE}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, stream: true }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`API ${res.status}: ${detail}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.content) onChunk(parsed.content);
        } catch {
          // skip malformed chunks
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export const api = {
  drugs: {
    search: (q: string) => get<DrugSearchResult[]>(`/drugs/search?q=${encodeURIComponent(q)}`),
    trending: () => get<TrendingDrug[]>("/drugs/trending"),
    detail: (id: number) => get<DrugSearchResult>(`/drugs/${id}`),
    names: (q: string) => get<string[]>(`/drugs/names?q=${encodeURIComponent(q)}`),
    coverage: (drugs: string[]) => post<CoverageMatrix>("/drugs/coverage", { drugs }),
  },
  compare: {
    byDrug: (drug: string) => get<PayerComparison[]>(`/compare?drug=${encodeURIComponent(drug)}`),
    summary: (drug: string) => get<CompareSummary>(`/compare/summary?drug=${encodeURIComponent(drug)}`),
    payers: () => get<string[]>("/payers"),
  },
  ai: {
    status: () => get<{ ask_ai_ready: boolean }>("/ai/status"),
    chat: (messages: ChatMessage[]) => post<{ content: string }>("/ai/chat", { messages, stream: false }),
    suggestedPrompts: () => get<string[]>("/ai/suggested-prompts"),
  },
  policies: {
    list: () => get<PolicySummary[]>("/policies"),
    stats: () => get<PolicyStats>("/policies/stats"),
    changes: (limit = 50) => get<PolicyChange[]>(`/policies/changes?limit=${limit}`),
    changesStats: () => get<ChangesStats>("/policies/changes/stats"),
    detail: (id: number) => get<unknown>(`/policies/${id}`),
  },
  ingest: {
    status: () => get<IngestStatus>("/ingest/status"),
    upload: async (file: File, payerHint: string): Promise<IngestResult> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("payer_hint", payerHint);
      const res = await fetch(`${BASE}/ingest/upload`, { method: "POST", body: formData });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Upload failed: ${detail}`);
      }
      return res.json();
    },
  },
};
