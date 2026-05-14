import { useState, useRef, useEffect, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, streamChat } from "../lib/api";
import type { ChatMessage } from "../lib/types";

function MarkdownContent({ content }: { content: string }) {
  const html = content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800">$1</code>')
    .replace(/^### (.+)$/gm, '<h4 class="font-bold text-base mt-4 mb-2 text-slate-900">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-lg mt-5 mb-2 text-slate-900">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold text-xl mt-5 mb-3 text-slate-900">$1</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-700">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-700">$2</li>')
    .replace(/\n\n/g, '<br/><br/>');
  return <div className="prose-sm" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function AskAIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: prompts } = useQuery({
    queryKey: ["ai", "suggested-prompts"],
    queryFn: api.ai.suggestedPrompts,
    staleTime: 300_000,
  });

  const { data: aiStatus } = useQuery({
    queryKey: ["ai", "status"],
    queryFn: api.ai.status,
    staleTime: 60_000,
  });

  const askAiConfigured = !aiStatus || aiStatus.ask_ai_ready;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isStreaming || !askAiConfigured) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages([...updatedMessages, assistantMsg]);

    streamChat(
      updatedMessages,
      (chunk) => {
        assistantMsg.content += chunk;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...assistantMsg };
          return next;
        });
      },
      () => setIsStreaming(false),
      (err) => {
        assistantMsg.content += `\n\n**Error:** ${err.message}`;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...assistantMsg };
          return next;
        });
        setIsStreaming(false);
      },
    );
  }

  function handlePromptClick(prompt: string) {
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {aiStatus && !aiStatus.ask_ai_ready && (
        <div className="shrink-0 px-8 pt-6 max-w-4xl mx-auto w-full">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold text-amber-900">Ask AI needs a Google API key</p>
            <p className="mt-1 text-amber-900/90">
              Set <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs">GOOGLE_API_KEY</code>{" "}
              in <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs">backend/.env</code>{" "}
              (copy from <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs">.env.template</code>
              ), use a key from{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-amber-800 underline underline-offset-2"
              >
                Google AI Studio
              </a>
              , then restart the FastAPI server.
            </p>
          </div>
        </div>
      )}
      <section className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar max-w-4xl mx-auto w-full space-y-8">
        {showWelcome && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#0EA5A0]/10 flex items-center justify-center mb-6">
              <span
                className="material-symbols-outlined text-[#0EA5A0] text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                psychology
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ask Policy Lens AI</h2>
            <p className="text-slate-500 max-w-md mb-8">
              Ask questions about drug coverage, prior authorization criteria, step therapy
              requirements, and policy differences across payers.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl w-full">
              {(prompts || [
                "Which plans cover Bevacizumab?",
                "What PA criteria does Cigna require for Rituximab?",
                "Compare coverage across all payers",
                "What policy changes happened recently?",
              ]).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePromptClick(prompt)}
                  className="text-left px-4 py-3 bg-white rounded-xl text-sm text-slate-700 whisper-shadow hover:text-[#0EA5A0] hover:border-[#0EA5A0]/30 transition-all border border-slate-100 flex items-start gap-3"
                >
                  <span className="material-symbols-outlined text-[#0EA5A0] text-base mt-0.5 shrink-0">
                    auto_awesome
                  </span>
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx}>
            {msg.role === "user" ? (
              <div className="flex flex-col items-end max-w-[85%] ml-auto">
                <div className="bg-white rounded-2xl rounded-tr-none px-6 py-4 border border-slate-100 whisper-shadow">
                  <p className="text-on-surface text-base leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4 max-w-[95%]">
                <div className="w-8 h-8 rounded-lg bg-[#0EA5A0] flex items-center justify-center text-white shrink-0 mt-1">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    psychology
                  </span>
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none px-6 py-5 border border-slate-100 whisper-shadow flex-1 min-w-0">
                  {msg.content ? (
                    <MarkdownContent content={msg.content} />
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-[#0EA5A0] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-[#0EA5A0] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-[#0EA5A0] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs">Analyzing policies...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </section>

      <footer className="w-full bg-white/80 backdrop-blur-md px-8 py-6 border-t border-slate-200/50">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length > 0 && !isStreaming && (
            <div className="flex flex-wrap gap-2">
              {(prompts?.slice(0, 3) || []).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-4 py-2 bg-white rounded-full text-xs font-medium text-slate-600 whisper-shadow hover:text-[#0EA5A0] hover:scale-[1.02] transition-all flex items-center gap-2 border border-slate-100"
                >
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center bg-white rounded-2xl whisper-shadow border border-slate-200 px-4 py-2 group focus-within:border-[#0EA5A0]/50 transition-colors">
              <span className="material-symbols-outlined text-slate-400 mr-3">chat_bubble</span>
              <input
                ref={inputRef}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-slate-400 py-3"
                placeholder="Ask a clinical policy question..."
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isStreaming || !askAiConfigured}
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim() || !askAiConfigured}
                className="bg-[#0EA5A0] text-white p-2.5 rounded-xl flex items-center justify-center shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">
                  {isStreaming ? "hourglass_top" : "send"}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3 font-medium uppercase tracking-widest">
              Powered by Policy Lens AI • RAG-Enhanced Medical Knowledge Base
            </p>
          </form>
        </div>
      </footer>
    </div>
  );
}
