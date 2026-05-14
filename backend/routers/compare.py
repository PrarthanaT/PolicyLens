from __future__ import annotations

import json
from fastapi import APIRouter, Query
from database import get_db

router = APIRouter(prefix="/api", tags=["compare"])


def _parse_json_field(val: str | None) -> list | None:
    if not val:
        return None
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return None


@router.get("/payers")
async def list_payers():
    """List all distinct payers."""
    async with get_db() as db:
        cursor = await db.execute("SELECT DISTINCT payer FROM policies WHERE payer IS NOT NULL ORDER BY payer")
        rows = await cursor.fetchall()
    return [row["payer"] for row in rows]


@router.get("/compare")
async def compare_drug(drug: str = Query(..., min_length=1)):
    """
    Return all payers' data for a drug name, structured for the comparison matrix.
    Each entry represents one payer's policy data for that drug.
    """
    async with get_db() as db:
        cursor = await db.execute(
            """
            SELECT
                id, policy_id, payer, policy_title, effective_date,
                drug_name, generic_name, brand_names, hcpcs_code, hcpcs_codes,
                access_status_group, coverage_level, drug_category,
                prior_auth_required, prior_auth_criteria,
                step_therapy_required, step_therapy_details,
                site_of_care_required, site_of_care_details,
                dosing_limit_summary, covered_diagnoses, notes
            FROM drugs_unified
            WHERE drug_name LIKE ? OR generic_name LIKE ?
            ORDER BY payer
            """,
            (f"%{drug}%", f"%{drug}%"),
        )
        rows = await cursor.fetchall()

    # Group by payer — pick first matching drug per payer for the matrix
    seen_payers: dict[str, dict] = {}
    for row in rows:
        payer = row["payer"]
        if payer not in seen_payers:
            d = dict(row)
            d["covered_diagnoses"] = _parse_json_field(d.get("covered_diagnoses"))
            d["brand_names"] = _parse_json_field(d.get("brand_names"))
            d["hcpcs_codes"] = _parse_json_field(d.get("hcpcs_codes"))
            seen_payers[payer] = d

    return list(seen_payers.values())


@router.get("/compare/summary")
async def compare_summary(drug: str = Query(..., min_length=1)):
    """
    Return summary metrics for a drug across payers.
    """
    async with get_db() as db:
        cursor = await db.execute(
            """
            SELECT
                COUNT(DISTINCT payer) as payer_count,
                SUM(CASE WHEN prior_auth_required = 1 THEN 1 ELSE 0 END) as pa_required_count,
                SUM(CASE WHEN step_therapy_required = 1 THEN 1 ELSE 0 END) as step_therapy_count,
                SUM(CASE WHEN site_of_care_required = 1 THEN 1 ELSE 0 END) as site_of_care_count,
                COUNT(*) as total_entries
            FROM drugs_unified
            WHERE drug_name LIKE ? OR generic_name LIKE ?
            """,
            (f"%{drug}%", f"%{drug}%"),
        )
        row = await cursor.fetchone()

    payer_count = row["payer_count"] or 0
    total = row["total_entries"] or 1
    pa_count = row["pa_required_count"] or 0

    # Compute a variance score: how much PA requirements differ across payers
    pa_ratio = pa_count / total if total > 0 else 0
    variance = round(abs(pa_ratio - 0.5) * 200)  # 0-100 scale, 0 = max variance
    clinical_variance = f"{100 - variance}%"

    # Market access score: higher when fewer restrictions
    restriction_score = (pa_count + (row["step_therapy_count"] or 0) + (row["site_of_care_count"] or 0))
    max_possible = total * 3
    access_score = round((1 - restriction_score / max_possible) * 100) if max_possible > 0 else 0

    return {
        "payer_coverage": {"label": "Payer Coverage", "value": str(payer_count), "detail": f"of 5 payers"},
        "total_entries": {"label": "Drug Entries", "value": f"{total:02d}", "detail": "across plans"},
        "clinical_variance": {"label": "Clinical Variance", "value": clinical_variance, "detail": "Stable"},
        "market_access_score": {"label": "Market Access Score", "value": str(access_score), "detail": "/ 100", "primary": True},
    }
