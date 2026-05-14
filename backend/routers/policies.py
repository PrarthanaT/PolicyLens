from __future__ import annotations

import json
from fastapi import APIRouter, Query
from database import get_db

router = APIRouter(prefix="/api/policies", tags=["policies"])


@router.get("")
async def list_policies():
    """Return all policies with drug counts and summary stats."""
    async with get_db() as db:
        cursor = await db.execute("""
            SELECT
                p.id,
                p.payer,
                p.policy_title,
                p.document_type,
                p.effective_date,
                p.revision_date,
                p.prior_auth_required,
                p.site_of_care_restrictions,
                COUNT(d.id) as drug_count,
                SUM(CASE WHEN d.prior_auth_required = 1 THEN 1 ELSE 0 END) as pa_drug_count,
                SUM(CASE WHEN d.step_therapy_required = 1 THEN 1 ELSE 0 END) as step_therapy_drug_count
            FROM policies p
            LEFT JOIN drugs d ON d.policy_id = p.id
            GROUP BY p.id
            ORDER BY p.payer
        """)
        rows = await cursor.fetchall()

    return [dict(row) for row in rows]


@router.get("/stats")
async def policy_stats():
    """Return aggregate stats for the policy library."""
    async with get_db() as db:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM policies")
        total_policies = (await cursor.fetchone())["cnt"]

        cursor = await db.execute("SELECT COUNT(DISTINCT payer) as cnt FROM policies")
        total_payers = (await cursor.fetchone())["cnt"]

        cursor = await db.execute("SELECT COUNT(*) as cnt FROM drugs")
        total_drugs = (await cursor.fetchone())["cnt"]

        cursor = await db.execute(
            "SELECT MAX(effective_date) as latest FROM policies WHERE effective_date IS NOT NULL"
        )
        latest = (await cursor.fetchone())["latest"]

    return {
        "total_policies": total_policies,
        "total_payers": total_payers,
        "total_drugs": total_drugs,
        "latest_indexed": latest or "N/A",
    }


@router.get("/changes")
async def policy_changes(limit: int = Query(50, ge=1, le=200)):
    """Return parsed policy changes from all policies, sorted by recency."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, payer, policy_title, effective_date, policy_changes FROM policies WHERE policy_changes IS NOT NULL"
        )
        rows = await cursor.fetchall()

    all_changes = []
    for row in rows:
        d = dict(row)
        raw = d.get("policy_changes")
        if not raw:
            continue
        try:
            changes_list = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            continue

        if not isinstance(changes_list, list):
            continue

        for change_text in changes_list:
            date_part = ""
            description = change_text
            # Try to extract date prefix (e.g. "January 2026: ..." or "01/15/10: ...")
            if ":" in change_text:
                potential_date = change_text.split(":")[0].strip()
                if any(c.isdigit() for c in potential_date):
                    date_part = potential_date
                    description = change_text[len(potential_date) + 1:].strip()

            severity = "Minor"
            desc_lower = description.lower()
            if any(kw in desc_lower for kw in ["removed", "deleted", "change", "changed", "updated", "revised"]):
                severity = "Moderate"
            if any(kw in desc_lower for kw in ["new ", "added", "new to market"]):
                severity = "Notable"
            if any(kw in desc_lower for kw in ["criteria change", "clinical major", "criteria update"]):
                severity = "Clinical"

            all_changes.append({
                "policy_id": d["id"],
                "payer": d["payer"],
                "policy_title": d["policy_title"],
                "effective_date": d["effective_date"],
                "change_date": date_part,
                "description": description,
                "severity": severity,
            })

    # Sort by change_date descending (best-effort string sort; most are "Month Year" or "MM/DD/YY")
    all_changes.sort(key=lambda c: c["change_date"], reverse=True)
    return all_changes[:limit]


@router.get("/changes/stats")
async def changes_stats():
    """Summary stats for the changes feed."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, policy_changes FROM policies WHERE policy_changes IS NOT NULL"
        )
        rows = await cursor.fetchall()

    total = 0
    clinical_count = 0
    for row in rows:
        try:
            changes = json.loads(row["policy_changes"])
            if isinstance(changes, list):
                total += len(changes)
                for c in changes:
                    cl = c.lower()
                    if any(kw in cl for kw in ["criteria change", "criteria update"]):
                        clinical_count += 1
        except (json.JSONDecodeError, TypeError):
            continue

    return {
        "total_changes": total,
        "clinical_updates": clinical_count,
        "coding_updates": total - clinical_count,
        "policies_with_changes": len(rows),
    }


@router.get("/{policy_id}")
async def get_policy(policy_id: int):
    """Get full detail for a single policy including all related data."""
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM policies WHERE id = ?", (policy_id,))
        policy = await cursor.fetchone()
        if not policy:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Policy not found")

        policy_dict = dict(policy)
        if policy_dict.get("policy_changes"):
            try:
                policy_dict["policy_changes"] = json.loads(policy_dict["policy_changes"])
            except (json.JSONDecodeError, TypeError):
                pass

        cursor = await db.execute(
            "SELECT COUNT(*) as cnt FROM drugs WHERE policy_id = ?", (policy_id,)
        )
        policy_dict["drug_count"] = (await cursor.fetchone())["cnt"]

        cursor = await db.execute(
            "SELECT * FROM covered_indications WHERE policy_id = ?", (policy_id,)
        )
        policy_dict["covered_indications"] = [dict(r) for r in await cursor.fetchall()]

        cursor = await db.execute(
            "SELECT * FROM step_therapy WHERE policy_id = ?", (policy_id,)
        )
        policy_dict["step_therapy"] = [dict(r) for r in await cursor.fetchall()]

        cursor = await db.execute(
            "SELECT * FROM dosing_limits WHERE policy_id = ?", (policy_id,)
        )
        policy_dict["dosing_limits"] = [dict(r) for r in await cursor.fetchall()]

        cursor = await db.execute(
            "SELECT * FROM excluded_indications WHERE policy_id = ?", (policy_id,)
        )
        policy_dict["excluded_indications"] = [dict(r) for r in await cursor.fetchall()]

    return policy_dict
