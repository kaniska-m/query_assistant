"""
nl_services.py — Natural-language → Oracle SQL using a local SQLCoder GGUF model.

Scope: RM_ONT, RM_ONT_HISTORY, RM_OLT_HISTORY, RM_OLT, RM_ONT_AVAILABILITY
Speed improvements:
  - Static schema (no live DB fetch on every call)
  - Schema string built once at import time
  - Tight max_tokens (200) — enough for any single Oracle SELECT
  - Aggressive stop tokens cut generation early
  - n_batch tuned for throughput
"""

import os
import re
import time
from llama_cpp import Llama

from app.schemas.nl_schema import (
    STATIC_SCHEMA,
    TABLE_ALIASES,
    TABLE_DESCRIPTIONS,
    JOIN_MAP,
)

# ── Model path ────────────────────────────────────────────────────────────────
MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    "./model/sqlcoder-7b-2/sqlcoder-7b-q5_k_m.gguf",
)

# ── Load model once ───────────────────────────────────────────────────────────
print(f"[NL] Loading model from {MODEL_PATH} …")

llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=4096,        # ← change from 2048 to 4096
    n_threads=int(os.environ.get("MODEL_THREADS", "4")),
    verbose=False,
)
print("[NL] Model loaded and ready")

# ── Build schema string once at import time ───────────────────────────────────
def _build_schema_block() -> str:
    lines = []
    for table, cols in STATIC_SCHEMA.items():
        alias = TABLE_ALIASES[table]
        desc  = TABLE_DESCRIPTIONS[table]
        col_str = ", ".join(f"{c} ({t})" for c, t in cols)
        lines.append(f"-- {table} (alias: {alias}) — {desc}\n-- Columns: {col_str}")
    return "\n\n".join(lines)

_SCHEMA_BLOCK: str = _build_schema_block()

def _build_join_hints() -> str:
    hints = []
    for j in JOIN_MAP:
        kw = ", ".join(j["keywords"])
        hints.append(
            f"-- [{kw}] → JOIN {j['to_table']} ON "
            f"{TABLE_ALIASES[j['from_table']]}.{j['from_col']} = "
            f"{TABLE_ALIASES[j['to_table']]}.{j['to_col']}"
        )
    return "\n".join(hints)

_JOIN_HINTS: str = _build_join_hints()

# ── Prompt builder ────────────────────────────────────────────────────────────
def _build_prompt(user_question: str) -> str:
    return f"""### Task
Generate a single Oracle SQL SELECT query. Output ONLY the SQL — no explanation, no markdown, no semicolons.

### Oracle Rules
- Wrap every query: SELECT * FROM (<inner query>) WHERE ROWNUM <= 100
- ORDER BY goes INSIDE the subquery, before the ROWNUM wrapper
- Dates: TO_DATE('YYYY-MM-DD','YYYY-MM-DD') or SYSDATE - N for relative dates
- NEVER use LIMIT — Oracle uses ROWNUM
- ALWAYS decode STATE columns using: CASE WHEN x.STATE=0 THEN 'DOWN' WHEN x.STATE=1 THEN 'UP' WHEN x.STATE=7 THEN 'UNKNOWN' ELSE 'OTHER' END AS STATE_DESC
- Apply the same CASE decode for TEMP_STATE and HSTATUS columns when selected

### Available Tables (use ONLY these)
{_SCHEMA_BLOCK}

### Join Hints (apply only when keywords match)
{_JOIN_HINTS}

### Aliases
o=RM_ONT, h=RM_ONT_HISTORY, olth=RM_OLT_HISTORY, olt=RM_OLT, av=RM_ONT_AVAILABILITY

### Examples
Q: Count ONTs by APP_STATUS
A: SELECT * FROM (SELECT o.APP_STATUS, COUNT(*) AS CNT FROM RM_ONT o GROUP BY o.APP_STATUS) WHERE ROWNUM <= 100

Q: Show RM_ONT_HISTORY for serial CDTB-88:0:0:13 in 2019
A: SELECT * FROM (SELECT h.SERIAL_NO, h.NAME, CASE WHEN h.STATE=0 THEN 'DOWN' WHEN h.STATE=1 THEN 'UP' WHEN h.STATE=7 THEN 'UNKNOWN' ELSE 'OTHER' END AS STATE_DESC, h.TIME_STAMP FROM RM_ONT_HISTORY h WHERE h.SERIAL_NO = 'CDTB-88:0:0:13' AND h.TIME_STAMP >= TO_DATE('2019-01-01','YYYY-MM-DD') AND h.TIME_STAMP <= TO_DATE('2019-12-31','YYYY-MM-DD') ORDER BY h.TIME_STAMP DESC) WHERE ROWNUM <= 100

Q: Show availability for ONT serial CDTB-88:0:0:13 from Jan to Mar 2019
A: SELECT * FROM (SELECT o.SERIAL_NO, av.DOWN_TIME, av.UP_TIME, av.REMARKS FROM RM_ONT o JOIN RM_ONT_AVAILABILITY av ON o.SERIAL_NO = av.ONT_SERIAL_NO WHERE o.SERIAL_NO = 'CDTB-88:0:0:13' AND av.TIME_STAMP BETWEEN TO_DATE('2019-01-01','YYYY-MM-DD') AND TO_DATE('2019-03-31','YYYY-MM-DD')) WHERE ROWNUM <= 100

Q: Show OLT history from last 7 days
A: SELECT * FROM (SELECT olth.NAME, olth.IP, CASE WHEN olth.STATE=0 THEN 'DOWN' WHEN olth.STATE=1 THEN 'UP' WHEN olth.STATE=7 THEN 'UNKNOWN' ELSE 'OTHER' END AS STATE_DESC, olth.TIME_STAMP FROM RM_OLT_HISTORY olth WHERE olth.TIME_STAMP >= SYSDATE - 7 ORDER BY olth.TIME_STAMP DESC) WHERE ROWNUM <= 100

Q: List current OLTs with state 0
A: SELECT * FROM (SELECT olt.NAME, olt.IP, CASE WHEN olt.STATE=0 THEN 'DOWN' WHEN olt.STATE=1 THEN 'UP' WHEN olt.STATE=7 THEN 'UNKNOWN' ELSE 'OTHER' END AS STATE_DESC, olt.TIME_STAMP FROM RM_OLT olt WHERE olt.STATE = 0) WHERE ROWNUM <= 100

Q: Show ONTs where STATE is DOWN
A: SELECT * FROM (SELECT o.SERIAL_NO, o.NAME, CASE WHEN o.STATE=0 THEN 'DOWN' WHEN o.STATE=1 THEN 'UP' WHEN o.STATE=7 THEN 'UNKNOWN' ELSE 'OTHER' END AS STATE_DESC, o.APP_STATUS, o.TIME_STAMP FROM RM_ONT o WHERE o.STATE = 0 ORDER BY o.TIME_STAMP DESC) WHERE ROWNUM <= 100

### Question
{user_question}

### SQL
"""


# ── Oracle syntax fixups ─────────────────────────────────────────────────────
# Patterns the model commonly generates that are invalid in Oracle
_INTERVAL_FIXES = [
    # Compound: CURRENT_DATE/NOW() - INTERVAL 'N unit' → SYSDATE - N
    (re.compile(r"(?:CURRENT_DATE|CURRENT_TIMESTAMP|NOW\(\))\s*-\s*INTERVAL\s+\'1\s+month\'", re.IGNORECASE), "SYSDATE - 30"),
    (re.compile(r"(?:CURRENT_DATE|CURRENT_TIMESTAMP|NOW\(\))\s*-\s*INTERVAL\s+\'(\d+)\s+days?\'", re.IGNORECASE), r"SYSDATE - \1"),
    (re.compile(r"(?:CURRENT_DATE|CURRENT_TIMESTAMP|NOW\(\))\s*-\s*INTERVAL\s+\'(\d+)\s+weeks?\'", re.IGNORECASE), r"SYSDATE - \1*7"),
    (re.compile(r"(?:CURRENT_DATE|CURRENT_TIMESTAMP|NOW\(\))\s*-\s*INTERVAL\s+\'1\s+year\'", re.IGNORECASE), "SYSDATE - 365"),
    # Standalone INTERVAL after SYSDATE already present
    (re.compile(r"INTERVAL\s+\'1\s+month\'", re.IGNORECASE),       "30"),
    (re.compile(r"INTERVAL\s+\'1\'\s+MONTH", re.IGNORECASE),       "30"),
    (re.compile(r"INTERVAL\s+\'(\d+)\s+days?\'", re.IGNORECASE),  r"\1"),
    (re.compile(r"INTERVAL\s+\'(\d+)\'\s+DAY", re.IGNORECASE),    r"\1"),
    (re.compile(r"INTERVAL\s+\'1\s+week\'", re.IGNORECASE),        "7"),
    (re.compile(r"INTERVAL\s+\'(\d+)\s+weeks?\'", re.IGNORECASE), r"\1*7"),
    (re.compile(r"INTERVAL\s+\'1\s+year\'", re.IGNORECASE),        "365"),
    # Bare CURRENT_DATE / NOW() remaining → SYSDATE
    (re.compile(r"\bCURRENT_DATE\b", re.IGNORECASE),                 "SYSDATE"),
    (re.compile(r"\bCURRENT_TIMESTAMP\b", re.IGNORECASE),            "SYSDATE"),
    (re.compile(r"\bNOW\(\)", re.IGNORECASE),                       "SYSDATE"),
    # MySQL LIMIT N → strip (ROWNUM wrapper handles limiting)
    (re.compile(r"\bLIMIT\s+\d+", re.IGNORECASE),                   ""),
]

def _fix_oracle_syntax(sql: str) -> str:
    for pattern, replacement in _INTERVAL_FIXES:
        sql = pattern.sub(replacement, sql)
    return sql


# ── SQL post-processing ───────────────────────────────────────────────────────
def _clean_sql(raw: str) -> str:
    """Strip markdown fences, extra lines, trailing junk, fix Oracle syntax."""
    # Remove ```sql ... ``` fences
    raw = re.sub(r"```[a-z]*", "", raw, flags=re.IGNORECASE).replace("```", "")

    # Take only the first SELECT … (stop at blank line or second SELECT)
    lines = []
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped:
            if lines:          # first blank line after content → stop
                break
            continue
        # Stop if a second independent SELECT starts (model hallucinating extra queries)
        if stripped.upper().startswith("SELECT") and lines and not lines[-1].strip().upper().endswith("("):
            break
        lines.append(line)

    sql = " ".join(l.strip() for l in lines)

    # Collapse multiple spaces
    sql = re.sub(r"\s+", " ", sql).strip()

    # Remove trailing semicolon
    sql = sql.rstrip(";").strip()

    # Fix invalid Oracle syntax patterns
    sql = _fix_oracle_syntax(sql)

    return sql

def nl_to_sql(prompt: str) -> str:
    full_prompt = _build_prompt(prompt)
    print(f"[NL] Generating SQL for: {prompt!r}")
    t0 = time.time()

    try:
        output = llm(
            full_prompt,
            max_tokens=200,
            temperature=0.0,
            top_p=1.0,
            repeat_penalty=1.1,
            stop=[
                "###",
                "\n\n",
                ";",
                "Question:",
                "Q:",
            ],
            echo=False,
        )
        elapsed = time.time() - t0
        raw_sql = output["choices"][0]["text"]
        print(f"[NL] Raw ({elapsed:.1f}s): {raw_sql!r}")

        sql = _clean_sql(raw_sql)
        print(f"[NL] Final: {sql}")
        return sql

    except AssertionError as e:
        # GGML internal assertion failure — usually means prompt exceeded n_ctx
        elapsed = time.time() - t0
        print(f"[NL] GGML crash after {elapsed:.1f}s: {e}")
        raise Exception(
            "Model crashed — prompt may have exceeded context limit. "
            "Try a shorter or simpler query."
        )

    except Exception as e:
        elapsed = time.time() - t0
        print(f"[NL] Inference failed after {elapsed:.1f}s: {e}")
        raise Exception(f"Model inference failed: {str(e)}")