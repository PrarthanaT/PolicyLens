from __future__ import annotations

import json
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AsyncOpenAI
from database import get_db

router = APIRouter(prefix="/api/ai", tags=["ai"])

GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

client = AsyncOpenAI(
    api_key=GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)

SYSTEM_PROMPT = """\
You are Policy Lens AI, an expert clinical policy analyst for medical benefit drugs.
You have access to a database of medical benefit drug policies from multiple health payers
(insurance companies). Your role is to help analysts answer questions about drug coverage,
prior authorization criteria, step therapy requirements, site-of-care restrictions, and
policy differences across payers.

When answering:
- Be precise and cite specific payer names, policy titles, and effective dates
- When comparing across payers, organize your response clearly (e.g., by payer)
- Highlight important differences in coverage criteria, PA requirements, or restrictions
- If information is not available in the provided context, say so clearly
- Use clinical terminology appropriately but explain it when needed
- Format responses with markdown for readability (bold, bullets, headers)
- When mentioning HCPCS codes, include them as they help identify specific drugs

You will receive relevant database context with each question. Base your answers strictly
on the provided context data. Do not hallucinate policy details.
"""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    stream: bool = True


@router.get("/status")
async def ai_status():
    """Ask AI is ready when GOOGLE_API_KEY is set in backend/.env (see .env.template)."""
    key = (GEMINI_API_KEY or "").strip()
    return {"ask_ai_ready": bool(key)}


async def _build_context(user_message: str) -> str:
    """Query the database for relevant drug/policy context based on the user's question."""
    import re
    cleaned = re.sub(r'[^\w\s-]', ' ', user_message.lower())
    words = cleaned.split()
    search_terms = [w for w in words if len(w) > 2 and w not in {
        "the", "and", "for", "are", "what", "which", "how", "does", "that",
        "this", "with", "from", "have", "has", "was", "were", "been", "being",
        "will", "would", "could", "should", "can", "may", "plans", "plan",
        "drug", "drugs", "policy", "policies", "cover", "coverage", "covered",
        "require", "required", "requirement", "requirements", "criteria",
        "between", "across", "compare", "comparison", "payer", "payers",
        "about", "tell", "show", "list", "give",
    }]

    context_parts = []

    async with get_db() as db:
        # 1. Search for matching drugs
        if search_terms:
            conditions = []
            params = []
            for term in search_terms[:5]:
                conditions.append(
                    "(drug_name LIKE ? OR generic_name LIKE ? OR brand_names LIKE ? "
                    "OR drug_category LIKE ? OR hcpcs_code LIKE ?)"
                )
                p = f"%{term}%"
                params.extend([p, p, p, p, p])

            where = " OR ".join(conditions)
            cursor = await db.execute(
                f"""
                SELECT
                    payer, policy_title, effective_date, drug_name, generic_name,
                    brand_names, hcpcs_code, access_status_group, drug_category,
                    prior_auth_required, prior_auth_criteria,
                    step_therapy_required, step_therapy_details,
                    site_of_care_required, site_of_care_details,
                    dosing_limit_summary, covered_diagnoses, coverage_level, notes
                FROM drugs_unified
                WHERE {where}
                ORDER BY payer, drug_name
                LIMIT 25
                """,
                params,
            )
            rows = await cursor.fetchall()
            if rows:
                context_parts.append("=== DRUG COVERAGE DATA ===")
                for row in rows:
                    d = dict(row)
                    entry = f"\n--- {d['drug_name']} ({d['payer']}) ---"
                    entry += f"\nPolicy: {d['policy_title'] or 'N/A'}"
                    entry += f"\nEffective: {d['effective_date'] or 'N/A'}"
                    if d['generic_name']:
                        entry += f"\nGeneric: {d['generic_name']}"
                    if d['hcpcs_code']:
                        entry += f"\nHCPCS: {d['hcpcs_code']}"
                    entry += f"\nAccess: {d['access_status_group'] or 'covered'}"
                    entry += f"\nPA: {'Yes' if d['prior_auth_required'] else 'No'}"
                    if d['prior_auth_criteria']:
                        entry += f"\nPA Criteria: {str(d['prior_auth_criteria'])[:500]}"
                    entry += f"\nStep Therapy: {'Yes' if d['step_therapy_required'] else 'No'}"
                    if d['step_therapy_details']:
                        entry += f"\nStep Therapy: {str(d['step_therapy_details'])[:300]}"
                    if d['site_of_care_required']:
                        entry += f"\nSite of Care: {str(d['site_of_care_details'] or 'Restricted')[:200]}"
                    if d['dosing_limit_summary']:
                        entry += f"\nDosing: {str(d['dosing_limit_summary'])[:300]}"
                    if d['covered_diagnoses']:
                        entry += f"\nDiagnoses: {str(d['covered_diagnoses'])[:400]}"
                    context_parts.append(entry)

        # 2. Fetch covered indications for matched policies
        if search_terms:
            ind_params = []
            ind_conditions = []
            for term in search_terms[:5]:
                ind_conditions.append("(ci.indication_name LIKE ? OR ci.applies_to_products LIKE ?)")
                ind_params.extend([f"%{term}%", f"%{term}%"])

            ind_where = " OR ".join(ind_conditions)
            cursor = await db.execute(
                f"""
                SELECT p.payer, ci.indication_name, ci.clinical_criteria,
                       ci.required_combination_regimens, ci.icd10_codes, ci.applies_to_products
                FROM covered_indications ci
                JOIN policies p ON ci.policy_id = p.id
                WHERE {ind_where}
                LIMIT 20
                """,
                ind_params,
            )
            ind_rows = await cursor.fetchall()
            if ind_rows:
                context_parts.append("\n=== COVERED INDICATIONS ===")
                for row in ind_rows:
                    d = dict(row)
                    entry = f"\nPayer: {d['payer']}"
                    entry += f"\nIndication: {d['indication_name'] or 'N/A'}"
                    entry += f"\nClinical Criteria: {d['clinical_criteria'] or 'N/A'}"
                    if d['required_combination_regimens']:
                        entry += f"\nCombination Regimens: {d['required_combination_regimens']}"
                    if d['icd10_codes']:
                        entry += f"\nICD-10 Codes: {d['icd10_codes']}"
                    if d['applies_to_products']:
                        entry += f"\nApplies To: {d['applies_to_products']}"
                    context_parts.append(entry)

        # 3. Fetch step therapy details
        if search_terms:
            st_params = []
            st_conditions = []
            for term in search_terms[:5]:
                st_conditions.append("(st.applies_to_products LIKE ? OR st.condition_description LIKE ?)")
                st_params.extend([f"%{term}%", f"%{term}%"])

            st_where = " OR ".join(st_conditions)
            cursor = await db.execute(
                f"""
                SELECT p.payer, st.required_prior_drugs, st.condition_description, st.applies_to_products
                FROM step_therapy st
                JOIN policies p ON st.policy_id = p.id
                WHERE {st_where}
                LIMIT 15
                """,
                st_params,
            )
            st_rows = await cursor.fetchall()
            if st_rows:
                context_parts.append("\n=== STEP THERAPY REQUIREMENTS ===")
                for row in st_rows:
                    d = dict(row)
                    entry = f"\nPayer: {d['payer']}"
                    entry += f"\nRequired Prior Drugs: {d['required_prior_drugs'] or 'N/A'}"
                    entry += f"\nCondition: {d['condition_description'] or 'N/A'}"
                    entry += f"\nApplies To: {d['applies_to_products'] or 'N/A'}"
                    context_parts.append(entry)

        # 4. Policy-level info
        cursor = await db.execute(
            "SELECT id, payer, policy_title, effective_date, document_type, policy_changes FROM policies"
        )
        policy_rows = await cursor.fetchall()
        context_parts.append("\n=== ALL POLICIES IN DATABASE ===")
        for row in policy_rows:
            d = dict(row)
            entry = f"\nPayer: {d['payer']} | Title: {d['policy_title'] or 'N/A'}"
            entry += f" | Effective: {d['effective_date'] or 'N/A'} | Type: {d['document_type'] or 'N/A'}"
            if d['policy_changes']:
                try:
                    changes = json.loads(d['policy_changes'])
                    if isinstance(changes, list):
                        recent = changes[:3]
                        entry += f"\nRecent Changes ({len(changes)} total): " + "; ".join(
                            c[:150] for c in recent
                        )
                except (json.JSONDecodeError, TypeError):
                    pass
            context_parts.append(entry)

        # 5. General stats
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM drugs")
        drug_count = (await cursor.fetchone())["cnt"]
        cursor = await db.execute("SELECT COUNT(DISTINCT payer) as cnt FROM policies")
        payer_count = (await cursor.fetchone())["cnt"]
        context_parts.append(
            f"\n=== DATABASE STATS ===\nTotal drugs tracked: {drug_count}\nTotal payers: {payer_count}"
        )

    full_context = "\n".join(context_parts)
    if len(full_context) > 15000:
        full_context = full_context[:15000] + "\n\n[Context truncated for length]"
    return full_context


@router.post("/chat")
async def chat(req: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")

    last_user_msg = ""
    for msg in reversed(req.messages):
        if msg.role == "user":
            last_user_msg = msg.content
            break

    context = await _build_context(last_user_msg)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"DATABASE CONTEXT:\n{context}"},
    ]
    for msg in req.messages:
        messages.append({"role": msg.role, "content": msg.content})

    if req.stream:
        async def generate():
            stream = await client.chat.completions.create(
                model="gemini-2.0-flash",
                messages=messages,
                stream=True,
                temperature=0.3,
                max_tokens=2000,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield f"data: {json.dumps({'content': delta.content})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    else:
        response = await client.chat.completions.create(
            model="gemini-2.0-flash",
            messages=messages,
            temperature=0.3,
            max_tokens=2000,
        )
        return {"content": response.choices[0].message.content}


@router.get("/suggested-prompts")
async def suggested_prompts():
    """Return context-aware suggested prompts based on actual data in the database."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT DISTINCT drug_name FROM drugs_unified WHERE drug_name IS NOT NULL ORDER BY RANDOM() LIMIT 3"
        )
        drugs = [row["drug_name"] for row in await cursor.fetchall()]

        cursor = await db.execute(
            "SELECT DISTINCT payer FROM policies WHERE payer IS NOT NULL ORDER BY RANDOM() LIMIT 2"
        )
        payers = [row["payer"] for row in await cursor.fetchall()]

    prompts = []
    if drugs:
        prompts.append(f"Which plans cover {drugs[0]}?")
    if len(drugs) > 1 and payers:
        prompts.append(f"What are the PA criteria for {drugs[1]} at {payers[0]}?")
    if len(payers) > 1:
        prompts.append(f"Compare coverage policies between {payers[0]} and {payers[1]}")
    prompts.append("What policy changes happened most recently?")
    if len(drugs) > 2:
        prompts.append(f"What step therapy is required for {drugs[2]}?")

    return prompts[:4]
