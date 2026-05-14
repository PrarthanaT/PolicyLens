# Policy Lens
> 🏆 Winner · Innovation Hacks 2.0 · Arizona State University · April 2026

![Alt Text](https://github.com/SuhasR3/Policy-Lens/blob/main/frontend/demo.jpeg)

**Real-time drug coverage intelligence for market access analysts.**

Market access analysts spend hours opening payer websites, downloading PDFs, and manually
normalizing coverage data to answer one question. Policy Lens makes it 10 seconds.

**Stack:** Python 3, FastAPI, React 18, Vite, Tailwind CSS, Claude API,
PyMuPDF, pdfplumber, SQLite, Playwright

**Scale:** 1400+ policy documents · 84 payer networks · 400+ payers

---

## Problem

Health plans publish drug coverage policies as inconsistent, frequently-changing documents
across hundreds of payer portals. There is no centralized source. Answering
"What does Cigna require for Humira?" means opening 10 PDFs and manually normalizing
each one. That takes hours.

---

## Key Features

- **Cross-Payer Comparison** — 9-row normalized grid comparing coverage status, prior auth,
  step therapy, site of care, quantity limits, and access score across UHC, Cigna, Aetna, and BCBS
- **PA Friction Score** — 1–10 score quantifying how hard it actually is to get a drug approved
  at each payer, beyond binary covered/not covered.
- **Policy Change Tracker** — Field-level diffs with automatic classification:
  Clinical Major, Clinical Minor, Administrative, or Cosmetic
- **AI Ask** —  a Natural Language to SQL query translation system powered by a locally hosted LLM. Queries run against a normalized policy schema. Every response cites the source policy document ID.

---

## Architecture

**Ingestion pipeline** handles three structurally distinct source formats:
- UHC single-drug PDFs
- UPMC 200-page mega-documents requiring drug-level segmentation
- BCBS web portals with no downloadable PDF, requiring Playwright scraping

PyMuPDF + pdfplumber extract raw text. Claude Sonnet runs entity extraction and normalizes nine structured fields per policy and written to a normalized SQLite schema.

**Change detection** diffs incoming policy versions field-by-field against stored snapshots.
An LLM classifier then distinguishes Clinical Major changes from administrative noise.
90% of policy updates are cosmetic. Only the 10% that matter clinically surface to the analyst.

---

## Data Sources

| Payer | Source |
|-------|--------|
| UHC | uhcprovider.com medical/drug policy PDFs |
| Aetna | Clinical program summary PDFs |
| Cigna | Drug policy A-Z index |
| UPMC | Prior authorization policies portal |

---

## API
```
GET /api/drugs/search?q={query}
GET /api/comparison?drug={name}&payers={payer1,payer2,payer3,payer4}
```
