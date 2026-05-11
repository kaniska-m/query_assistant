from llama_cpp import Llama

MODEL_PATH = "./sqlcoder-7b-2/sqlcoder-7b-q5_k_m.gguf"

print("[Test] Loading model...")
llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=2048,        # reduced from 16384
    n_threads=4,       # reduced from 28
    verbose=False,
)
print("[Test] Model loaded!")

prompt = """### Task
Generate an Oracle SQL query to answer the following question.
This is Oracle Database — NOT MySQL, NOT PostgreSQL.

### Database Schema
Table: RM_ONT
Columns:
  - SERIAL_NO (VARCHAR2)
  - NAME (VARCHAR2)
  - APP_STATUS (VARCHAR2)
  - PHY_STATUS (VARCHAR2)
  - STATE (NUMBER)
  - TIME_STAMP (DATE)
  - VENDOR (NUMBER)
  - LOCATION_ID (NUMBER)

### Oracle-Specific Rules (STRICTLY follow these)
- Output ONLY the raw SQL. No explanation, no markdown, no backticks, no semicolons.
- NEVER use LIMIT — this is Oracle, not MySQL.
- ALWAYS limit rows using this exact subquery pattern:
    SELECT * FROM (...your full query here...) WHERE ROWNUM <= 100
- If query has ORDER BY, it MUST go inside the subquery:
    SELECT * FROM (SELECT ... ORDER BY col DESC) WHERE ROWNUM <= 100
- For relative dates use: SYSDATE - 30  (never TO_DATE(SYSDATE,...))
- Always use table aliases

### Examples
Question: Show ONTs where APP_STATUS is READY
SQL: SELECT * FROM (SELECT o.NAME, o.SERIAL_NO, o.APP_STATUS FROM RM_ONT o WHERE o.APP_STATUS = 'READY') WHERE ROWNUM <= 100

Question: List ONTs ordered by TIME_STAMP descending
SQL: SELECT * FROM (SELECT o.NAME, o.SERIAL_NO, o.TIME_STAMP FROM RM_ONT o ORDER BY o.TIME_STAMP DESC) WHERE ROWNUM <= 100

Question: Count ONTs grouped by APP_STATUS
SQL: SELECT * FROM (SELECT o.APP_STATUS, COUNT(*) AS CNT FROM RM_ONT o GROUP BY o.APP_STATUS) WHERE ROWNUM <= 100

### Question
Show 10 ONTs where APP_STATUS is READY ordered by TIME_STAMP DESC

### SQL
"""

print("[Test] Generating SQL...")
import time
start = time.time()

output = llm(
    prompt,
    max_tokens=300,
    temperature=0.1,
    stop=["###", "\n\n", ";"],
    echo=False,
)

elapsed = time.time() - start
sql = output["choices"][0]["text"].strip()

print(f"\n[Test] Generated SQL:\n{sql}")
print(f"\n[Test] Time taken: {elapsed:.1f}s")