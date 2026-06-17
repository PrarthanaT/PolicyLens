# Policy Lens
**Cross payer drug coverage intelligence for market access analysts.**

> 🏆 Winner · Innovation Hacks 2.0 · Arizona State University · April 2026

The 2 AM problem this solves

Picture a market access analyst at 4pm on a Thursday. A client emails: "Does Cigna require step therapy before approving Humira, and has that changed recently?"

To answer, the analyst opens Cigna's PDF. Then UHC's, in case the client asks next. Then Florida Blue's. Each document is structured differently — some are clean single-drug policies, others are 40-page omnibus documents covering hundreds of drugs at once. There's no shared schema, no shared vocabulary, no way to query across them. The analyst reads, copies values into a spreadsheet by hand, and hopes nothing changed since the last time they checked.

That manual loop — discover the document, read it, normalize it, repeat per payer — is the entire bottleneck. PolicyIQ removes the middle two steps. Ingest a PDF once, and an LLM extraction pipeline pushes it into a normalized SQLite schema. From that point on, "what does Cigna require for Humira" isn't a reading exercise — it's a query.


How it actually works, in four steps


Drop in a PDF. pdfplumber pulls the raw text page by page.
Gemini 2.0 Flash extracts structure. A zero-shot JSON-schema prompt (temperature 0.1) turns unstructured policy text into rows — drug name, access status, prior auth flag, step therapy flag, indications, dosing limits.
Rows land in shared tables. Every payer's data — regardless of how their PDF was originally formatted — ends up in the same drugs, policies, covered_indications, and step_therapy tables.
Query it any way you want. Through a comparison grid, a friction heatmap, or a chat box that runs structured SQL retrieval against the schema in real time.



What's on screen

Drug Lookup — Type a drug, generic, or brand name. Get back per-payer cards: access status, PA flag, step therapy flag, HCPCS code, effective date. A trending strip surfaces the drugs with the most payer coverage entries, so analysts see what's actively being discussed across the index.

PA Friction Heatmap — The screen that does the most work for the least typing. A payer × drug grid where every cell is a friction score, not a binary yes/no. Three switchable lenses on the same grid: PA Friction Score (1–10), Step Therapy Burden (number of drugs a patient must fail first), and Approval Time (days). Row-level averages and auto-generated "highest burden" / "lowest burden" callouts turn a spreadsheet-shaped problem into something scannable in five seconds.

Multi-Drug Coverage Matrix — A chip-style input with autocomplete (kicks in after two characters). Add several drugs at once and get a { payers, drugs } grid back. A payer card only goes green if it covers every drug in the set — useful when a client's formulary question is really "do you cover this whole regimen," not just one drug.

Payer Comparison View — One column per payer, six rows per drug (Coverage Status, Prior Auth, Step Therapy, Site of Care, Indications, Dosing/Quantity), plus four summary metrics at the top: payer coverage count, total entries, Clinical Variance (the ratio of PA-required drugs), and the Market Access Score.

Ask AI — A streaming chat interface, but the retrieval underneath is intentionally not vector search (more on that below). Suggested prompts aren't hardcoded — three random drugs and two random payers get pulled from the live database on page load, so the suggestions always reflect what's actually in the index.

Policy Changes Feed — A timeline of every revision stored in the policy_changes JSON column. Each change gets a severity tag — Clinical, Notable, Moderate, Minor — assigned via keyword matching, and the feed is filterable by severity so an analyst can mute the noise and only see what's clinically meaningful.

Policy Ingestion — Drag a PDF in, optionally hint the payer name, and the extraction pipeline does the rest. Returns the extracted drug count and policy title so you know immediately whether the ingest worked.

Policy Library — The indexed-policies table with aggregate counts (total drugs, PA-required drugs, step-therapy drugs) computed via LEFT JOIN ... GROUP BY.


Engineering notes — the decisions worth defending

Schema-grounded retrieval, not vector RAG. This is the one decision a judge is most likely to push back on, so here's the reasoning: when your fields are named and structured — drug_name, payer, step_therapy_required — keyword LIKE matching against those columns beats chunk-similarity search, because you're not searching prose, you're searching a database. The chat endpoint tokenizes the user's message, strips stopwords, takes the first five meaningful terms, and fires up to four parallel parameterized SQL queries across drugs_unified, covered_indications, and step_therapy. The results get concatenated into up to 15K characters of structured context, which gets handed to Gemini alongside the system prompt. No embeddings, no vector store, no infrastructure to stand up or keep in sync. At this scale and with this field structure, it's the simpler and more accurate choice — though it's also the first thing that needs to change if the corpus grows past roughly 10K records (see Limitations).

One schema, two very different document shapes. Some payers publish one drug per PDF. Others — looking at you, Priority Health — bury 40+ drugs inside a single omnibus document. Rather than building per-payer parsing adapters, both document shapes get extracted into the same drugs table. Two SQL views (drugs_unified, drug_access_summary) use COALESCE chains to resolve drug_name and hcpcs_code, so every downstream consumer — the comparison page, the heatmap, the chat retriever — reads clean, consistent fields and has no idea which document shape a given row originally came from.

Streaming via Server-Sent Events, not WebSockets. FastAPI's StreamingResponse emits data: {...}\n\n chunks. The frontend reads these with a ReadableStream line-buffer that holds partial frames across network reads — necessary because a single network read doesn't guarantee you get a complete SSE frame. SSE was chosen over WebSockets because the chat is one-directional (server → client) once the request is sent; no need for the bidirectional complexity.

A friction score that's actually a formula, not a vibe. The Market Access Score is round((1 - restriction_score / max_possible) * 100), where restriction_score sums PA requirements, step therapy counts, and site-of-care restrictions across a payer's drug list. Lower score, more friction. It's a simple weighted formula, deliberately — explainable to a non-technical analyst beats a black-box model nobody can sanity-check on day one.

The UI is part of the technical story, not just decoration. Collapsing a payer-by-drug matrix that's genuinely high-dimensional into something a human reads in one glance — color-graded cells, switchable lenses, row aggregates, auto-surfaced "worst offender" callouts — is itself an engineering problem, not just a styling pass.


System layout

                     React 19 + Vite 8 + React Router 7 + TanStack Query 5
                     ─────────────────────────────────────────────────────
                     7 routed pages: Drug Lookup · Comparison · Heatmap ·
                                     Ask AI · Policy Changes · Ingest · Library
                     api.ts handles fetch() calls + the SSE ReadableStream reader
                                          │
                                          │  /api/*  (Vite dev proxy → :8000)
                                          ▼
                     FastAPI + uvicorn
                     ─────────────────────────────────────────────────────
                     drugs.py · compare.py · policies.py · ingest.py · ai.py
                                          │
                                          ▼
                     aiosqlite  →  db/policies.db
                     Tables:  policies, drugs, covered_indications,
                              step_therapy, dosing_limits, excluded_indications
                     Views:   drugs_unified, drug_access_summary
                                          │
                                          ▼
                     AsyncOpenAI client → Gemini 2.0 Flash
                     (via the OpenAI-compatible endpoint on
                      generativelanguage.googleapis.com)

     Separately:  pdfplumber runs synchronously, in-process, against
                  uploaded PDFs (temp files, deleted post-extraction)


Inside a single chat turn

1. User sends a message
2. POST /api/ai/chat   { messages, stream: true }
3. _build_context(last_user_message):
     a. tokenize → strip stopwords → keep first 5 terms
     b. LIKE query against drugs_unified (drug / generic / brand / category / hcpcs)
     c. LIKE query against covered_indications
     d. LIKE query against step_therapy
     e. SELECT * FROM policies, plus COUNT() aggregates
     f. concatenate all of the above, truncate to 15K chars
4. messages = [system: SYSTEM_PROMPT, system: DB_CONTEXT, ...full chat history]
5. AsyncOpenAI → gemini-2.0-flash, stream=True
6. StreamingResponse yields "data: {...}\n\n" chunks
7. Frontend's SSE reader buffers partial frames, appends tokens to the
   in-progress assistant message as they arrive


Stack, by layer

LayerChoiceFrontend frameworkReact 19 + TypeScriptBuild toolVite 8Routingreact-router-dom 7Server stateTanStack React Query 5StylingTailwind CSS 4Backend frameworkFastAPI + uvicornDatabase driveraiosqliteDatabaseSQLiteLLMGemini 2.0 Flash (OpenAI-compatible endpoint)PDF parsingpdfplumberStreaming protocolServer-Sent Events via StreamingResponse


What's actually in the database right now

This was built in a 36-hour window, so "production-grade" was never the bar — "works end-to-end against a real database with real extracted data" was. And it does: ingestion, schema-grounded retrieval, streaming chat, and the comparison UI all run against a live SQLite instance, not mocked responses.

Currently seeded with 5 ingested policies — Blue Cross NC, Cigna, Florida Blue, Priority Health, and UnitedHealthcare Commercial — covering 1,512 individual drug records. The ingestion endpoint is live, so dropping in a 6th payer's PDF grows the dataset on the spot; nothing about the schema assumes a fixed payer list.


Where this would break first at scale (said out loud, on purpose)

A demo that pretends to have no weaknesses is less convincing than one that knows exactly where the edges are:


No auth, no rate limiting. Single-tenant, single-process, by design for a 36-hour build.
Retrieval is LIKE with wildcards on both sides — full table scans, no indexes beyond implicit rowids. Fine at 1,512 rows. Not fine at 100,000.
The 15K character context cap will silently drop content from long, multi-page documents once a policy's relevant text exceeds that budget.
policy_changes sorts dates lexicographically on mixed-format strings. Ordering is correct often enough to demo, not reliable enough to trust.


What production hardening would actually look like


Auth, plus per-tenant API keys.
B-tree indexes on drugs.drug_name_normalized, drugs.payer, and policies.payer — turns the full scans above into sublinear lookups.
Swap wildcard LIKE retrieval for FTS5, or a hybrid keyword + vector retriever once the corpus crosses roughly 10K records and pure keyword matching starts missing semantically related but lexically different terms.
Move ingestion off the request thread and into a background queue (Celery or arq) — right now the upload endpoint blocks on the Gemini call, which is fine for a demo and not fine for a second concurrent upload.
Bounded request sizes, structured logging, per-step latency metrics.



Running it yourself

bashgit clone https://github.com/PrarthanaT/PolicyLens.git
cd PolicyLens

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.template .env
# add GOOGLE_API_KEY to .env
uvicorn main:app --reload

# Frontend — separate terminal
cd frontend
npm install
npm run dev

Visit http://localhost:5173. Vite's dev server proxies /api/* through to localhost:8000, so both halves need to be running.

Grab a free Gemini key at aistudio.google.com/apikey if you don't already have one.


Repo map

backend/
├── main.py                       FastAPI entry point, CORS, router mounting
├── database.py                   aiosqlite connection manager
└── routers/
    ├── drugs.py                  Drug search, coverage matrix, autocomplete
    ├── compare.py                Payer comparison, summary metrics
    ├── policies.py               Policy list, changes feed
    ├── ingest.py                 PDF upload → LLM extraction → DB insert
    └── ai.py                     Chat endpoint, context builder, SSE streaming

frontend/src/
├── App.tsx                       Client-side routing, 7 routes
├── lib/
│   ├── api.ts                    All HTTP calls + the SSE stream reader
│   └── types.ts                  Shared TypeScript interfaces
├── pages/
│   ├── DrugLookupPage.tsx        Search + trending strip + multi-drug grid
│   ├── ComparisonPage.tsx        Per-payer comparison table
│   ├── AskAIPage.tsx             Streaming chat interface
│   ├── PAFrictionHeatmapPage.tsx Payer-by-drug friction grid, 3 lenses
│   ├── PolicyChangesPage.tsx     Severity-tagged changes timeline
│   ├── IngestPage.tsx            Drag-and-drop PDF upload
│   └── LibraryPage.tsx           Indexed-policies table with aggregates
└── components/layout/            SideNavBar, TopAppBar, FloatingAIButton

db/
└── policies.db                   Pre-seeded SQLite database
```
