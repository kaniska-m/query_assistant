import os
import time
from llama_cpp import Llama
from app.schemas.nl_schema import PRIMARY_TABLES, JOINABLE_TABLES
from app.services.prompt_builder import build_primary_schema

MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    "./model/sqlcoder-7b-2/sqlcoder-7b-q5_k_m.gguf"
)

# ── Load once at startup ──────────────────────────────────────────
print(f"[NL] Loading model from {MODEL_PATH} ...")

llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=int(os.environ.get("MODEL_CTX", "2048")),
    n_threads=int(os.environ.get("MODEL_THREADS", "4")),
    verbose=False,
)

print("[NL] Model loaded and ready")

# ── Schema cache ──────────────────────────────────────────────────
_schema_cache = None

def get_cached_schema() -> str:
    global _schema_cache
    if _schema_cache is None:
        _schema_cache = build_primary_schema(PRIMARY_TABLES)
        print(f"[NL] Schema cached")
    return _schema_cache


def build_joinable_schema_str() -> str:
    """Build joinable tables as clean text for the prompt."""
    parts = []
    for t in JOINABLE_TABLES:
        j = t["join_on"]
        cols = ", ".join(t["columns"])
        parts.append(
            f"Table: {t['table']}\n"
            f"  Columns: {cols}\n"
            f"  Join: {j['from_table']}.{j['from_col']} = {t['table']}.{j['to_col']}\n"
            f"  Use when: {', '.join(t['use_when'])}"
        )
    return "\n\n".join(parts)


def build_full_prompt(user_prompt: str, primary_schema: str) -> str:
    joinable = build_joinable_schema_str()

    return f"""### Task
Generate an Oracle SQL query to answer the following question.
This is Oracle Database — NOT MySQL, NOT PostgreSQL.

### Primary Tables (always available)
{primary_schema}

### Joinable Tables (use only when keywords match)
{joinable}

### Oracle Rules (STRICTLY follow)
- Output ONLY raw SQL. No explanation, no markdown, no backticks, no semicolons.
- NEVER use LIMIT — this is Oracle, use ROWNUM instead.
- ALWAYS wrap in subquery: SELECT * FROM (...full query...) WHERE ROWNUM <= 100
- ORDER BY must go INSIDE the subquery.
- Use SYSDATE - 30 for relative dates, never TO_DATE(SYSDATE,...).
- Always use table aliases: o=RM_ONT, h=RM_ONT_HISTORY, al=RM_ALARM, loc=APP_RM_LOCATION, av=RM_ONT_AVAILABILITY, rs=RM_RESOURCE_STATE, op=RM_ONT_OPTICAL_POWER, v=RM_VENDOR.
- When joining RM_RESOURCE_STATE, alias rs.STATE AS STATE_LABEL.

### Examples
Question: Count RM_ONT records grouped by APP_STATUS
SQL: SELECT * FROM (SELECT o.APP_STATUS, COUNT(*) AS CNT FROM RM_ONT o GROUP BY o.APP_STATUS) WHERE ROWNUM <= 100

Question: List ONTs where PHY_STATUS is ACTIVATED ordered by TIME_STAMP DESC
SQL: SELECT * FROM (SELECT o.NAME, o.SERIAL_NO, o.PHY_STATUS, o.TIME_STAMP FROM RM_ONT o WHERE o.PHY_STATUS = 'ACTIVATED' ORDER BY o.TIME_STAMP DESC) WHERE ROWNUM <= 100

Question: Show all DOWN ONTs with state name
SQL: SELECT * FROM (SELECT o.NAME, o.SERIAL_NO, rs.STATE AS STATE_LABEL FROM RM_ONT o JOIN RM_RESOURCE_STATE rs ON o.STATE = rs.ID WHERE rs.STATE = 'DOWN') WHERE ROWNUM <= 100

Question: Count alarms grouped by severity for last 30 days
SQL: SELECT * FROM (SELECT al.NMS_SEVERITY, COUNT(*) AS CNT FROM RM_ONT o JOIN RM_ALARM al ON o.NAME = al.RES_NAME WHERE al.NE_TIME > SYSDATE - 30 GROUP BY al.NMS_SEVERITY) WHERE ROWNUM <= 100

Question: Show availability for ONT serial CDTB-88:0:0:13 from January to March 2019
SQL: SELECT * FROM (SELECT o.SERIAL_NO, av.DOWN_TIME, av.UP_TIME, av.REMARKS FROM RM_ONT o JOIN RM_ONT_AVAILABILITY av ON o.SERIAL_NO = av.ONT_SERIAL_NO WHERE o.SERIAL_NO = 'CDTB-88:0:0:13' AND av.TIME_STAMP BETWEEN TO_DATE('2019-01-01','YYYY-MM-DD') AND TO_DATE('2019-03-31','YYYY-MM-DD')) WHERE ROWNUM <= 100

Question: Count ONTs grouped by vendor name
SQL: SELECT * FROM (SELECT v.VENDOR_NAME, COUNT(*) AS CNT FROM RM_ONT o JOIN RM_VENDOR v ON o.VENDOR = v.ID GROUP BY v.VENDOR_NAME) WHERE ROWNUM <= 100

Question: Show ONTs with their district and location details
SQL: SELECT * FROM (SELECT o.NAME, o.SERIAL_NO, loc.DISTRICT, loc.LOCATION_NAME FROM RM_ONT o JOIN APP_RM_LOCATION loc ON o.LOCATION_ID = loc.ID) WHERE ROWNUM <= 100

### Question
{user_prompt}

### SQL
"""


# ── Main function ─────────────────────────────────────────────────
def nl_to_sql(prompt: str) -> str:
    schema = get_cached_schema()

    if not schema.strip():
        raise Exception("Schema could not be loaded. Check DB connection.")

    full_prompt = build_full_prompt(prompt, schema)

    print(f"[NL] Generating SQL for: {prompt}")
    start = time.time()

    output = llm(
        full_prompt,
        max_tokens=300,
        temperature=0.1,
        stop=["###", "\n\n", ";"],
        echo=False,
    )

    elapsed = time.time() - start
    sql = output["choices"][0]["text"].strip()
    print(f"[NL] Raw: {sql}")
    print(f"[NL] Time: {elapsed:.1f}s")

    # Strip markdown fences if any slipped through
    if "```" in sql:
        parts = sql.split("```")
        sql = parts[1] if len(parts) > 1 else parts[0]
        if sql.lower().startswith("sql"):
            sql = sql[3:]

    sql = sql.strip().rstrip(";")
    print(f"[NL] Final SQL: {sql}")
    return sql