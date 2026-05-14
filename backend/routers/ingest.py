from __future__ import annotations

import json
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from openai import AsyncOpenAI
import pdfplumber
from database import get_db

router = APIRouter(prefix="/api/ingest", tags=["ingest"])

GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

client = AsyncOpenAI(
    api_key=GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)

EXTRACTION_PROMPT = """\
You are a medical policy document analyst. Extract structured data from the following
medical benefit drug policy document text. Return a JSON object with these fields:

{
  "payer": "Name of the health plan / payer",
  "policy_title": "Title of the policy document",
  "document_type": "single_drug_policy or drug_list",
  "effective_date": "Date the policy is effective (YYYY-MM-DD or as stated)",
  "drugs": [
    {
      "drug_name": "Primary drug name",
      "generic_name": "Generic / chemical name",
      "brand_names": ["List of brand names"],
      "hcpcs_code": "HCPCS/J-code if mentioned",
      "drug_category": "Therapeutic category",
      "access_status_group": "preferred, non_preferred, covered, not_covered",
      "prior_auth_required": true/false,
      "prior_auth_criteria": "Description of PA criteria if any",
      "step_therapy_required": true/false,
      "step_therapy_details": "Step therapy requirements if any",
      "site_of_care_required": true/false,
      "site_of_care_details": "Site restrictions if any",
      "dosing_limit_summary": "Dosing limits if mentioned",
      "covered_diagnoses": ["List of covered indications/diagnoses"]
    }
  ],
  "covered_indications": [
    {
      "indication_name": "Name of the indication",
      "clinical_criteria": "Clinical criteria for coverage",
      "icd10_codes": "ICD-10 codes if listed"
    }
  ],
  "policy_changes": ["List of historical changes if documented"]
}

Be thorough but only include information actually present in the document.
Return ONLY valid JSON, no other text.
"""


def extract_pdf_text(file_path: str) -> str:
    text_parts = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


@router.post("/upload")
async def upload_policy(file: UploadFile = File(...), payer_hint: str = Form("")):
    """Upload a PDF policy document, extract text, and use AI to parse structured data."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        raw_text = extract_pdf_text(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {e}")
    finally:
        os.unlink(tmp_path)

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")

    # Truncate if too long for the model context
    text_for_ai = raw_text[:15000]

    try:
        response = await client.chat.completions.create(
            model="gemini-2.0-flash",
            messages=[
                {"role": "system", "content": EXTRACTION_PROMPT},
                {"role": "user", "content": f"Payer hint: {payer_hint}\n\nDocument text:\n{text_for_ai}"},
            ],
            temperature=0.1,
            max_tokens=4000,
        )
        raw_content = response.choices[0].message.content
        # Strip markdown code fences if present
        if raw_content.strip().startswith("```"):
            raw_content = raw_content.strip().split("\n", 1)[1].rsplit("```", 1)[0]
        extracted = json.loads(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {e}")

    # Store in database
    async with get_db() as db:
        payer = extracted.get("payer") or payer_hint or "Unknown"
        policy_title = extracted.get("policy_title", file.filename)
        effective_date = extracted.get("effective_date")
        document_type = extracted.get("document_type", "single_drug_policy")
        policy_changes = extracted.get("policy_changes")

        cursor = await db.execute(
            """
            INSERT INTO policies (source_filename, payer, policy_title, document_type,
                                  effective_date, policy_changes, raw_text)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                file.filename,
                payer,
                policy_title,
                document_type,
                effective_date,
                json.dumps(policy_changes) if policy_changes else None,
                raw_text[:50000],
            ),
        )
        policy_id = cursor.lastrowid

        drugs_inserted = 0
        for drug in extracted.get("drugs", []):
            covered_diagnoses = drug.get("covered_diagnoses")
            brand_names = drug.get("brand_names")
            await db.execute(
                """
                INSERT INTO drugs (
                    policy_id, drug_name, generic_name, brand_names, hcpcs_code,
                    drug_category, access_status_group, prior_auth_required,
                    prior_auth_criteria, step_therapy_required, step_therapy_details,
                    site_of_care_required, site_of_care_details, dosing_limit_summary,
                    covered_diagnoses, drug_name_normalized
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    policy_id,
                    drug.get("drug_name"),
                    drug.get("generic_name"),
                    json.dumps(brand_names) if brand_names else None,
                    drug.get("hcpcs_code"),
                    drug.get("drug_category"),
                    drug.get("access_status_group", "covered"),
                    1 if drug.get("prior_auth_required") else 0,
                    drug.get("prior_auth_criteria"),
                    1 if drug.get("step_therapy_required") else 0,
                    drug.get("step_therapy_details"),
                    1 if drug.get("site_of_care_required") else 0,
                    drug.get("site_of_care_details"),
                    drug.get("dosing_limit_summary"),
                    json.dumps(covered_diagnoses) if covered_diagnoses else None,
                    drug.get("drug_name", "").lower().strip() if drug.get("drug_name") else None,
                ),
            )
            drugs_inserted += 1

        for indication in extracted.get("covered_indications", []):
            await db.execute(
                """
                INSERT INTO covered_indications (policy_id, indication_name, clinical_criteria, icd10_codes)
                VALUES (?, ?, ?, ?)
                """,
                (
                    policy_id,
                    indication.get("indication_name"),
                    indication.get("clinical_criteria"),
                    indication.get("icd10_codes"),
                ),
            )

        await db.commit()

    return {
        "status": "success",
        "policy_id": policy_id,
        "payer": payer,
        "policy_title": policy_title,
        "drugs_extracted": drugs_inserted,
        "text_length": len(raw_text),
        "preview": extracted,
    }


@router.get("/status")
async def ingest_status():
    """Return current database stats for the ingestion dashboard."""
    async with get_db() as db:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM policies")
        policies = (await cursor.fetchone())["cnt"]

        cursor = await db.execute("SELECT COUNT(*) as cnt FROM drugs")
        drugs = (await cursor.fetchone())["cnt"]

        cursor = await db.execute("SELECT COUNT(DISTINCT payer) as cnt FROM policies")
        payers = (await cursor.fetchone())["cnt"]

        cursor = await db.execute(
            "SELECT source_filename, payer, policy_title FROM policies ORDER BY id DESC LIMIT 5"
        )
        recent = [dict(r) for r in await cursor.fetchall()]

    return {
        "total_policies": policies,
        "total_drugs": drugs,
        "total_payers": payers,
        "recent_ingestions": recent,
    }
