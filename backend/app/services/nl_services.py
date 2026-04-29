import os
from groq import Groq
from app.rag.retriever import get_relevant_schemas, is_ready
from datetime import date

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def nl_to_sql(prompt: str) -> str:
    if not is_ready():
        raise Exception(
            "Schema index not built. Run: python ingest_schema.py from the backend folder."
        )

    schema = get_relevant_schemas(prompt, top_k=8)

    if not schema.strip():
        raise Exception("Could not retrieve relevant schema. Check ChromaDB index.")

    today = date.today().strftime("%Y-%m-%d")

    system = f"""You are an expert Oracle SQL generator for a telecom network management system.

TODAY'S DATE: {today}

AVAILABLE TABLES AND THEIR EXACT COLUMNS:
{schema}

STRICT COLUMN RULES — READ CAREFULLY:
1. Before writing any column name, check: does it appear in the "Available columns" list for that table?
2. If the column you need does NOT exist in a table, do NOT use that table — pick a different one from the list.
3. NEVER invent or guess column names. NEVER use a column that is not listed above.
4. If multiple tables seem relevant, pick the ONE where the required columns actually exist.

STRICT SQL RULES:
- Output ONLY the raw SQL. No explanation, no markdown, no backticks, no semicolons.
- Oracle syntax only:
    * Row limit: WHERE ROWNUM <= 100  (never use LIMIT)
    * Date math: column >= SYSDATE - 30  (for "last 30 days")
    * Today's date: TO_DATE('{today}', 'YYYY-MM-DD') or SYSDATE
    * Case-insensitive match: UPPER(column) = UPPER('value')
- If the user asks for "active" records, look for a STATUS or STATE column and filter = 'ACTIVE'
- If NO table has the columns needed → return exactly: SELECT 'Not supported with available schema' FROM DUAL

VERIFICATION STEP (do this mentally before outputting):
- For each column you use: confirm it is in the "Available columns" list above.
- For each table you use: confirm you are only using columns listed under that table.
"""

    print(f"[NL Service] Sending prompt to Groq: {prompt}")
    print(f"[NL Service] Schema injected ({len(schema)} chars)")

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        temperature=0.0,  # zero temp = most deterministic, least hallucination
        max_tokens=512,
    )

    sql = response.choices[0].message.content.strip()
    print(f"[NL Service] Raw LLM response: {sql}")

    if "```" in sql:
        parts = sql.split("```")
        sql = parts[1] if len(parts) > 1 else parts[0]
        if sql.lower().startswith("sql"):
            sql = sql[3:]

    sql = sql.strip().rstrip(";")
    print(f"[NL Service] Final SQL: {sql}")
    return sql