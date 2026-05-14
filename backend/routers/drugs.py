from __future__ import annotations

import json
from fastapi import APIRouter, Query
from pydantic import BaseModel
from database import get_db

router = APIRouter(prefix="/api/drugs", tags=["drugs"])


class CoverageRequest(BaseModel):
    drugs: list[str]


def _parse_json_field(val: str | None) -> list | None:
    if not val:
        return None
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return None


def _row_to_dict(row) -> dict:
    d = dict(row)
    d["covered_diagnoses"] = _parse_json_field(d.get("covered_diagnoses"))
    d["brand_names"] = _parse_json_field(d.get("brand_names"))
    d["hcpcs_codes"] = _parse_json_field(d.get("hcpcs_codes"))
    d["covered_alternatives"] = _parse_json_field(d.get("covered_alternatives"))
    return d


@router.get("/search")
async def search_drugs(q: str = Query(..., min_length=1)):
    """Search drugs by name across all payers. Returns results grouped by payer."""
    async with get_db() as db:
        query = """
            SELECT
                id, policy_id, payer, policy_title, effective_date,
                drug_name, generic_name, brand_names, hcpcs_code,
                access_status_group, drug_category,
                prior_auth_required, step_therapy_required,
                site_of_care_required, dosing_limit_summary,
                covered_diagnoses, coverage_level, notes
            FROM drugs_unified
            WHERE drug_name LIKE ? OR generic_name LIKE ? OR brand_names LIKE ?
            ORDER BY payer, drug_name
            LIMIT 100
        """
        param = f"%{q}%"
        cursor = await db.execute(query, (param, param, param))
        rows = await cursor.fetchall()

    return [_row_to_dict(row) for row in rows]


@router.get("/trending")
async def trending_drugs():
    """Return top drugs by number of payers that list them."""
    async with get_db() as db:
        cursor = await db.execute("""
            SELECT drug_name, COUNT(DISTINCT payer) as payer_count
            FROM drugs_unified
            WHERE drug_name IS NOT NULL
            GROUP BY drug_name
            ORDER BY payer_count DESC, drug_name
            LIMIT 8
        """)
        rows = await cursor.fetchall()

    return [{"drug_name": row["drug_name"], "payer_count": row["payer_count"]} for row in rows]


@router.get("/names")
async def drug_names(q: str = Query(..., min_length=1)):
    """Autocomplete: return distinct normalized drug names matching query."""
    async with get_db() as db:
        cursor = await db.execute(
            """
            SELECT DISTINCT drug_name_normalized
            FROM drug_access_summary
            WHERE drug_name_normalized LIKE ?
            ORDER BY drug_name_normalized
            LIMIT 20
            """,
            (f"%{q}%",),
        )
        rows = await cursor.fetchall()
    return [row["drug_name_normalized"] for row in rows]


@router.post("/coverage")
async def drug_coverage(req: CoverageRequest):
    """Return a payer x drug coverage matrix for multiple drugs."""
    if not req.drugs:
        return {"payers": [], "drugs": {}}

    placeholders = ",".join("?" for _ in req.drugs)
    async with get_db() as db:
        cursor = await db.execute(
            f"""
            SELECT payer, drug_name_normalized, access_status_group, prior_auth_required
            FROM drug_access_summary
            WHERE drug_name_normalized IN ({placeholders})
            """,
            req.drugs,
        )
        rows = await cursor.fetchall()

        payer_cursor = await db.execute(
            "SELECT DISTINCT payer FROM drug_access_summary ORDER BY payer"
        )
        payer_rows = await payer_cursor.fetchall()

    all_payers = [r["payer"] for r in payer_rows]

    drugs: dict[str, dict[str, dict]] = {drug: {} for drug in req.drugs}
    for row in rows:
        drug = row["drug_name_normalized"]
        payer = row["payer"]
        status = row["access_status_group"]
        is_covered = status != "not_covered"
        drugs[drug][payer] = {
            "covered": is_covered,
            "status": status,
            "prior_auth": bool(row["prior_auth_required"]),
        }

    for drug in req.drugs:
        for payer in all_payers:
            if payer not in drugs[drug]:
                drugs[drug][payer] = {"covered": False, "status": None, "prior_auth": False}

    return {"payers": all_payers, "drugs": drugs}


@router.get("/{drug_id}")
async def get_drug(drug_id: int):
    """Get full detail for a single drug entry with related structured data."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM drugs_unified WHERE id = ?",
            (drug_id,),
        )
        row = await cursor.fetchone()

        if not row:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Drug not found")

        result = _row_to_dict(row)
        policy_id = result["policy_id"]

        cursor = await db.execute(
            "SELECT * FROM covered_indications WHERE policy_id = ?", (policy_id,)
        )
        result["covered_indications"] = [dict(r) for r in await cursor.fetchall()]

        cursor = await db.execute(
            "SELECT * FROM step_therapy WHERE policy_id = ?", (policy_id,)
        )
        result["step_therapy_entries"] = [dict(r) for r in await cursor.fetchall()]

        cursor = await db.execute(
            "SELECT * FROM dosing_limits WHERE policy_id = ?", (policy_id,)
        )
        result["dosing_limits"] = [dict(r) for r in await cursor.fetchall()]

        cursor = await db.execute(
            "SELECT * FROM excluded_indications WHERE policy_id = ?", (policy_id,)
        )
        result["excluded_indications"] = [dict(r) for r in await cursor.fetchall()]

    return result
