# Policy Lens
**Cross payer drug coverage intelligence for market access analysts.**

> 🏆 Winner · Innovation Hacks 2.0 · Arizona State University · April 2026

Search, compare, and query medical benefit drug coverage policies across multiple health insurance payers through a single interface. Ingest payer PDFs once; query the normalized data through a comparison UI or a streaming natural language chat that runs structured retrieval against a SQLite schema.

---

<img width="800" height="446" alt="PolicyLens" src="https://github.com/user-attachments/assets/511f972d-e853-467f-95a9-36d614d05bfa" />

**Full Video:** [link](https://www.youtube.com/watch?v=ZK5N2csVXVo)

---

## The problem

Health plans publish drug coverage policies as inconsistent, frequently changing documents scattered across hundreds of payer portals. Answering "what does Cigna require for Humira?" means opening multiple PDFs and manually normalizing each one. That takes hours.

Policy Lens centralizes payer policies into a structured schema and exposes them through a comparison UI and a chat interface. Each new payer document goes through an LLM powered extraction pipeline and lands in the same normalized tables, so cross payer comparison becomes a SQL query instead of a manual reading exercise.

---

## What makes this interesting

**Schema grounded retrieval, not vector RAG.** Keyword extraction on the query fires up to four parallel parameterized SQL queries across the policy tables and assembles up to 15K chars of structured context before calling Gemini, grounded in the schema rather than chunk similarity. On named structured fields at this scale, exact and LIKE matching beats embeddings and ships no vector store to operate.

**Streaming responses over SSE.** FastAPI `StreamingResponse` emits `data: {...}` chunks; the frontend stitches them with a `ReadableStream` line buffer that holds partial frames across network reads.

**LLM powered ingestion pipeline.** Drop a PDF, `pdfplumber` pulls text page by page, `gemini-2.0-flash` runs a zero shot JSON schema extraction at `temperature=0.1`, and structured drug rows insert straight into the normalized schema. No regex parsers, no per payer adapters.

**One schema for heterogeneous documents.** Two document types feed a single `drugs` table; two SQL views use COALESCE chains to resolve `drug_name` and `hcpcs_code` so every downstream query reads clean fields and never knows which document type a row came from.

**UI engineering as the product.** The comparison surface and PA Friction Heatmap collapse a high dimensional payer by drug matrix into a scannable view: color graded cells, switchable lenses, row level aggregates, and auto surfaced highest and lowest burden callouts.

**Cross payer Market Access Score.** A 0 to 100 friction score per payer, `round((1 - restriction_score / max_possible) * 100)`, summing PA, step therapy, and site of care drug counts. Lower means more friction.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  React 19 + Vite 8 + React Router 7 + TanStack Query 5              │
│  Pages: DrugLookup, Comparison, Heatmap, AskAI,                     │
│         PolicyChanges, Ingest, Library                              │
│  api.ts ── fetch() / SSE ReadableStream                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ /api/*  (Vite proxy → :8000)
┌──────────────────────────▼──────────────────────────────────────────┐
│  FastAPI + uvicorn                                                  │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐    │
│  │ drugs.py │ │compare.py│ │policies  │ │ingest.py │ │  ai.py  │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘    │
│       │            │            │            │            │         │
│  ┌────▼────────────▼────────────▼────────────▼────────────▼─────┐   │
│  │  aiosqlite ── db/policies.db                                  │  │
│  │  Tables: policies, drugs, covered_indications,                │  │
│  │          step_therapy, dosing_limits, excluded_indications    │  │
│  │  Views:  drugs_unified, drug_access_summary                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  AsyncOpenAI ──► generativelanguage.googleapis.com/v1beta/openai/   │
│                  model: gemini-2.0-flash                            │
└─────────────────────────────────────────────────────────────────────┘
          │ pdfplumber (sync, in process)
          ▼
     Uploaded PDFs (temp files, deleted after extraction)
```

### How the chat retrieval works

```
User submits message
  → POST /api/ai/chat  { messages, stream: true }
  → _build_context(last_user_message):
       1. Tokenize, filter stopwords, take first 5 terms
       2. LIKE query: drugs_unified (drug, generic, brand, category, hcpcs)
       3. LIKE query: covered_indications
       4. LIKE query: step_therapy
       5. SELECT * FROM policies, plus COUNT aggregates
       6. Concatenate sections, truncate to 15K chars
  → messages = [system: SYSTEM_PROMPT, system: DB_CONTEXT, ...user history]
  → AsyncOpenAI → gemini-2.0-flash, stream=True
  → StreamingResponse emits "data: {...}\n\n" chunks
  → Frontend SSE reader buffers and appends to assistant message
```

---

## Features

**Drug Lookup.** Search by drug, generic, or brand name. Returns per payer coverage cards with access status, prior auth flag, step therapy flag, effective date, and HCPCS code. A trending bar shows the top drugs by number of payers listing them.

**Multi Drug Coverage Matrix.** Chip input with autocomplete (active after 2 characters). Type multiple drugs; receive a `{ payers, drugs }` grid showing per payer coverage across the full set. Payer cards turn green only when the payer covers every selected drug.

**Payer Comparison View.** One column per payer, six rows per drug: Coverage Status, Prior Auth, Step Therapy, Site of Care, Indications (first 3), Dosing/Quantity. Four summary metrics: Payer Coverage count, total entries, Clinical Variance (PA ratio), Market Access Score.

**Ask AI.** Streaming chat over the normalized policy database. Suggested prompts are generated dynamically from live data (3 random drugs and 2 random payers picked from the DB on page load). Responses render incrementally as the stream arrives.

**PA Friction Heatmap.** A data visualization surface that renders payer friction across three switchable lenses: PA Friction Score (1 to 10), Step Therapy Burden (number of required prior drugs), and Approval Time (days). Color graded cells, per row averages, and highest and lowest burden insight cards per view turn a dense payer by drug matrix into a view an analyst reads without a spreadsheet.

**Policy Changes Feed.** Timeline view of all policy revisions stored in the `policy_changes` JSON column. Severity is classified by keyword matching: Clinical, Notable, Moderate, Minor. Filterable by severity.

**Policy Ingestion.** Drag and drop PDF upload with optional payer hint. `pdfplumber` extracts text page by page, truncated to 15K chars and sent to `gemini-2.0-flash` with a JSON schema extraction prompt. Result rows insert into `policies`, `drugs`, and `covered_indications` in one transaction. Returns extracted drug count and policy title.

**Policy Library.** Indexed policies table with aggregate counts (drugs, PA drugs, step therapy drugs) via `LEFT JOIN ... GROUP BY p.id`.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Routing | react-router-dom 7 |
| Server state | TanStack React Query 5 |
| Backend | FastAPI, uvicorn, aiosqlite |
| Database | SQLite |
| LLM | Google Gemini 2.0 Flash (via OpenAI compatible endpoint) |
| PDF parsing | pdfplumber |
| Streaming | Server Sent Events over `StreamingResponse` |

---

## Scope

Hackathon prototype, 36 hour build. The ingestion pipeline, schema grounded retrieval, streaming chat, and comparison UI all work end to end against the live database. Production hardening was out of scope for the build.

**Current demo dataset:** 5 pre ingested policies (Blue Cross NC, Cigna, Florida Blue, Priority Health, UnitedHealthcare Commercial) covering 1,512 drug records. The ingestion pipeline accepts new PDFs and writes to the same schema, so the dataset grows with each upload.

**Known limitations:**

- No authentication or rate limiting. Single tenant, single process.
- No vector store or semantic search. Retrieval is keyword LIKE queries with leading and trailing wildcards (full table scans). No indexes defined beyond implicit rowids.
- 15K character truncation drops content from long multi page documents.
- `policy_changes` date sort is lexicographic on mixed format strings; ordering is unreliable.

**Production roadmap:**

1. Auth and per tenant API keys.
2. btree indexes on `drugs.drug_name_normalized`, `drugs.payer`, and `policies.payer` for sublinear search.
3. Replace LIKE wildcard retrieval with FTS5 or a hybrid keyword plus vector retriever once the corpus exceeds ~10K records.
4. Background task queue for ingestion (Celery or arq); the upload endpoint currently blocks on Gemini.
5. Bounded request size, structured logging, per step latency metrics.

---

## Getting Started

```bash
git clone https://github.com/SuhasR3/Policy-Lens.git
cd Policy-Lens

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.template .env
# add GOOGLE_API_KEY to .env
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api/*` to `localhost:8000`.

Get a Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

---

## Project Structure

```
backend/
├── main.py                       # FastAPI entry point, CORS, router mounting
├── database.py                   # aiosqlite connection manager
└── routers/
    ├── drugs.py                  # Drug search, coverage matrix, autocomplete
    ├── compare.py                # Payer comparison, summary metrics
    ├── policies.py               # Policy list, changes feed
    ├── ingest.py                 # PDF upload, LLM extraction, DB insert
    └── ai.py                     # Chat endpoint, retrieval context builder, SSE streaming

frontend/src/
├── App.tsx                       # Client routing (7 routes)
├── lib/
│   ├── api.ts                    # All HTTP calls, SSE reader
│   └── types.ts                  # TypeScript interfaces
├── pages/
│   ├── DrugLookupPage.tsx        # Search + trending + multi drug grid
│   ├── ComparisonPage.tsx        # Per payer comparison table
│   ├── AskAIPage.tsx             # Streaming chat interface
│   ├── PAFrictionHeatmapPage.tsx # Payer by drug friction grid
│   ├── PolicyChangesPage.tsx     # Changes timeline
│   ├── IngestPage.tsx            # PDF upload UI
│   └── LibraryPage.tsx           # Indexed policies table
└── components/layout/            # SideNavBar, TopAppBar, FloatingAIButton

db/
└── policies.db                   # Pre seeded SQLite database
```
