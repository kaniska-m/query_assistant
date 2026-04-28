import os
from groq import Groq
from app.services.metadata_service import get_tables, get_columns

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def get_schema_context(prompt: str):
    """Only include schema for tables mentioned in the prompt."""
    tables = get_tables()
    prompt_upper = prompt.upper()
    
    # Find which tables are mentioned in the prompt
    mentioned = [t for t in tables if t.upper() in prompt_upper]
    
    # If none mentioned, send just the table names list (no columns)
    # so LLM can pick the right one
    if not mentioned:
        return "Available tables: " + ", ".join(tables)
    
    # Only send columns for mentioned tables
    schema = []
    for table in mentioned:
        cols = get_columns(table)
        col_str = ", ".join(f"{c['name']} ({c['type']})" for c in cols)
        schema.append(f"Table {table}:\n  {col_str}")
    return "\n\n".join(schema)

SYSTEM_PROMPT = """You are an expert Oracle SQL query generator.

You will be given a database schema and a natural language question.
Your job is to generate a valid Oracle SQL query that answers the question.

Rules:
- Output ONLY the raw SQL query, no explanations, no markdown, no backticks
- Use Oracle syntax (ROWNUM for limits, not LIMIT)
- Never use semicolons at the end
- Only use tables and columns that exist in the schema
- For string comparisons use single quotes
- For date comparisons use TO_DATE() if needed
- Default to ROWNUM <= 100 if no limit is specified
- Use UPPER() for case-insensitive string matching when appropriate

Database: Oracle (gemsdb)
Schema:
{schema}
"""

def nl_to_sql(prompt: str) -> str:
    schema = get_schema_context(prompt)
    system = SYSTEM_PROMPT.format(schema=schema)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",   # best Groq model for SQL
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,           # low temp = more deterministic SQL
        max_tokens=512,
    )

    sql = response.choices[0].message.content.strip()

    # Strip accidental markdown fences if model adds them
    if sql.startswith("```"):
        sql = sql.split("```")[1]
        if sql.lower().startswith("sql"):
            sql = sql[3:]
    sql = sql.strip().rstrip(";")

    return sql