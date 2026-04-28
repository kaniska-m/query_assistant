import os
from groq import Groq
from app.services.metadata_service import get_columns

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

NL_TABLES = ["RM_ONT", "RM_ONT_HISTORY"]

def build_schema() -> str:
    schema_parts = []
    for table in NL_TABLES:
        cols = get_columns(table)
        print(f"[NL Service] {table} → {len(cols)} columns loaded")  # debug
        if not cols:
            print(f"[NL Service] WARNING: No columns found for {table}!")
            continue
        col_lines = "\n".join(f"    - {c['name']} ({c['type']})" for c in cols)
        schema_parts.append(f"Table: {table}\nColumns:\n{col_lines}")
    result = "\n\n".join(schema_parts)
    print(f"[NL Service] Schema built:\n{result}\n")  # debug
    return result


def get_schema() -> str:
    """Always fetch fresh — remove caching until we confirm it works."""
    return build_schema()


def nl_to_sql(prompt: str) -> str:
    schema = get_schema()

    if not schema.strip():
        raise Exception("Schema could not be loaded. Check DB connection.")

    system = f"""You are an expert Oracle SQL query generator for a telecom network management system.

You have access to ONLY these tables and columns. DO NOT use any table or column not listed below.

{schema}

STRICT RULES:
- Output ONLY the raw SQL query. No explanations, no markdown, no backticks, no semicolons.
- ONLY use the exact table names and column names listed above. Never invent or guess names.
- Use Oracle syntax:
    * Row limits: AND ROWNUM <= 100 (never use LIMIT)
    * Date filter: column >= TO_DATE('2024-01-21', 'YYYY-MM-DD') AND column <= TO_DATE('2024-03-31', 'YYYY-MM-DD')
    * Case-insensitive: UPPER(column) = UPPER('value')
- For availability or history queries → use RM_ONT_HISTORY
- For current ONT device info → use RM_ONT
- For serial number → use SERIAL_NO column
- If query is impossible with given tables/columns → return: SELECT 'Not supported' FROM DUAL
"""

    print(f"[NL Service] Sending prompt to Groq: {prompt}")

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=512,
    )

    sql = response.choices[0].message.content.strip()
    print(f"[NL Service] Raw LLM response: {sql}")

    # Clean markdown fences
    if "```" in sql:
        parts = sql.split("```")
        sql = parts[1] if len(parts) > 1 else parts[0]
        if sql.lower().startswith("sql"):
            sql = sql[3:]

    sql = sql.strip().rstrip(";")
    print(f"[NL Service] Final SQL: {sql}")
    return sql
    