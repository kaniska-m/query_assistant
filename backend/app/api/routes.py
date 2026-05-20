from fastapi import APIRouter, HTTPException
from app.services.db_service import execute_query
from app.services.nl_services import nl_to_sql
from app.services.metadata_service import (
    get_tables,
    get_columns,
    get_distinct_values,
)
from app.services.sql_builder import build_query
from app.utils.sql_validator import validate_query
from app.config.db_config import get_all_db_names
import time

router = APIRouter()


# ── 0. LIST ALL CONFIGURED DATABASES ─────────────────────────────
@router.get("/databases")
def list_databases():
    """Returns all databases defined in db_config.py."""
    try:
        return {"databases": get_all_db_names()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Helper — extract db_name from payload with fallback ──────────
def _db(payload: dict) -> str:
    return payload.get("db_name") or "gemsdb"


# ── 1. DIRECT SQL EXECUTOR ────────────────────────────────────────
@router.post("/execute_sql")
def execute_sql(payload: dict):
    query = payload.get("query")
    db    = _db(payload)

    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    try:
        validate_query(query)
        start  = time.time()
        result = execute_query(query, db)
        end    = time.time()

        return {
            "query":          query,
            "columns":        result["columns"],
            "data":           result["data"],
            "execution_time": f"{end - start:.3f}s",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. GET TABLES ─────────────────────────────────────────────────
@router.get("/tables")
def tables(db_name: str = "gemsdb"):
    try:
        return {"tables": get_tables(db_name)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. GET COLUMNS FOR TABLE ──────────────────────────────────────
@router.get("/tables/{table}/columns")
def columns(table: str, db_name: str = "gemsdb"):
    try:
        return {"columns": get_columns(table, db_name)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. GET DISTINCT VALUES FOR COLUMN ────────────────────────────
@router.get("/tables/{table}/columns/{column}/values")
def values(table: str, column: str, db_name: str = "gemsdb"):
    try:
        return {"values": get_distinct_values(table, column, db_name)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. QUERY BUILDER → GENERATE SQL (PREVIEW) ────────────────────
@router.post("/query-builder/generate")
def generate_query(payload: dict):
    try:
        query = build_query(payload)
        return {"query": query}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── 6. NL TO SQL ──────────────────────────────────────────────────
@router.post("/nl-to-sql")
def natural_language_to_sql(payload: dict):
    prompt = payload.get("prompt")
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    try:
        query = nl_to_sql(prompt)
        return {"query": query}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 7. QUERY BUILDER → EXECUTE ────────────────────────────────────
@router.post("/query-builder/execute")
def execute_builder(payload: dict):
    db = _db(payload)
    try:
        query = build_query(payload)
        validate_query(query)

        start  = time.time()
        result = execute_query(query, db)
        end    = time.time()

        return {
            "query":          query,
            "columns":        result["columns"],
            "data":           result["data"],
            "execution_time": f"{end - start:.3f}s",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))