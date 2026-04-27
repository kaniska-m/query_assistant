from fastapi import APIRouter, HTTPException
from app.services.db_service import execute_query
from app.services.metadata_service import (
    get_tables,
    get_columns,
    get_distinct_values
)
from app.services.sql_builder import build_query
from app.utils.sql_validator import validate_query
import time

router = APIRouter()


# 🔷 1. DIRECT SQL EXECUTOR (your existing feature)
@router.post("/execute-sql")
def execute_sql(payload: dict):
    query = payload.get("query")

    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    try:
        validate_query(query)

        start = time.time()
        result = execute_query(query)
        end = time.time()

        return {
            "query": query,
            "columns": result["columns"],
            "data": result["data"],
            "execution_time": f"{end - start:.3f}s"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 🔷 2. GET TABLES
@router.get("/tables")
def tables():
    try:
        return {"tables": get_tables()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 🔷 3. GET COLUMNS FOR TABLE
@router.get("/tables/{table}/columns")
def columns(table: str):
    try:
        return {"columns": get_columns(table)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 🔷 4. GET DISTINCT VALUES FOR COLUMN
@router.get("/tables/{table}/columns/{column}/values")
def values(table: str, column: str):
    try:
        return {"values": get_distinct_values(table, column)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 🔷 5. QUERY BUILDER → GENERATE SQL (PREVIEW)
@router.post("/query-builder/generate")
def generate_query(payload: dict):
    try:
        query = build_query(payload)
        return {"query": query}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# 🔷 6. QUERY BUILDER → EXECUTE
@router.post("/query-builder/execute")
def execute_builder(payload: dict):
    try:
        query = build_query(payload)
        validate_query(query)

        start = time.time()
        result = execute_query(query)
        end = time.time()

        return {
            "query": query,
            "columns": result["columns"],
            "data": result["data"],
            "execution_time": f"{end - start:.3f}s"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))