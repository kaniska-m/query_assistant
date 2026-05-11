from app.schemas.nl_schema import JOINABLE_TABLES
from app.services.metadata_service import get_columns


def build_primary_schema(tables: list) -> str:
    """Fetch live columns from DB for primary tables."""
    parts = []
    for table in tables:
        cols = get_columns(table)
        if not cols:
            print(f"[PromptBuilder] WARNING: No columns found for {table}")
            continue
        col_lines = "\n".join(f"    - {c['name']} ({c['type']})" for c in cols)
        parts.append(f"Table: {table}\nColumns:\n{col_lines}")
    return "\n\n".join(parts)


def build_joinable_schema() -> str:
    """Build joinable tables section from schema registry."""
    parts = []
    for i, t in enumerate(JOINABLE_TABLES, 1):
        j = t["join_on"]
        col_list = ", ".join(t["columns"])
        keywords = ", ".join(t["use_when"])
        parts.append(
            f"{i}. {t['table']}\n"
            f"   Description: {t['description']}\n"
            f"   Columns: {col_list}\n"
            f"   Join: {j['from_table']}.{j['from_col']} = {t['table']}.{j['to_col']}\n"
            f"   Use when prompt contains: {keywords}"
        )
    return "\n\n".join(parts)


def build_join_rules() -> str:
    """Auto-generate join decision rules from schema registry."""
    rules = []
    for t in JOINABLE_TABLES:
        j = t["join_on"]
        keywords = " / ".join(t["use_when"])
        rules.append(
            f"- Keywords [{keywords}] → "
            f"JOIN {t['table']} ON "
            f"{j['from_table']}.{j['from_col']} = {t['table']}.{j['to_col']}"
        )
    return "\n".join(rules)


def build_system_prompt(primary_schema: str) -> str:
    joinable = build_joinable_schema()
    join_rules = build_join_rules()

    return f"""You are an expert Oracle SQL query generator for a telecom network management system.

PRIMARY TABLES (always available):
{primary_schema}

JOINABLE TABLES (use only when needed):
{joinable}

STRICT RULES:
- Output ONLY the raw SQL query. No explanations, no markdown, no backticks, no semicolons.
- Use ONLY exact column names listed above. Never invent column names.
- Always use table aliases (o=RM_ONT, h=RM_ONT_HISTORY, al=RM_ALARM, loc=APP_RM_LOCATION, av=RM_ONT_AVAILABILITY etc.)
- Oracle syntax only:
    * NEVER use ROWNUM in WHERE, GROUP BY, ORDER BY clauses directly.
    * ALWAYS wrap the full query in a subquery to apply ROWNUM like this:
      SELECT * FROM (<your full query here>) WHERE ROWNUM <= 100
    * Dates: TO_DATE('YYYY-MM-DD', 'YYYY-MM-DD')
    * For relative dates like "last 30 days": use SYSDATE - 30 directly, NOT TO_DATE(SYSDATE - 30, ...)
    * Case-insensitive: UPPER(column) = UPPER('value')

ROWNUM EXAMPLES (follow exactly):
  Simple query:
    SELECT * FROM (SELECT o.NAME, o.APP_STATUS FROM RM_ONT o WHERE o.APP_STATUS = 'READY') WHERE ROWNUM <= 100

  With ORDER BY (ORDER BY must be inside the subquery):
    SELECT * FROM (SELECT o.NAME, o.TIME_STAMP FROM RM_ONT o ORDER BY o.TIME_STAMP DESC) WHERE ROWNUM <= 100

  With GROUP BY:
    SELECT * FROM (SELECT o.APP_STATUS, COUNT(*) AS CNT FROM RM_ONT o GROUP BY o.APP_STATUS) WHERE ROWNUM <= 100

  With JOIN:
    SELECT * FROM (
      SELECT o.NAME, loc.DISTRICT FROM RM_ONT o JOIN APP_RM_LOCATION loc ON o.LOCATION_ID = loc.ID
    ) WHERE ROWNUM <= 100

JOIN DECISION RULES (apply based on keywords in the prompt):
{join_rules}

- If no join is needed, query only RM_ONT or RM_ONT_HISTORY
- If impossible with available tables: SELECT 'Query not supported' FROM DUAL
- RM_RESOURCE_STATE columns: ID (NUMBER), STATE (VARCHAR2)
  Values: 0=DOWN, 1=UP, 2=UNREACHABLE, 3=UNHEALTHY,
          4=WORKING-ACTIVATED, 5=WORKING-DEACTIVATED, 6=NON-WORKING,
          7=UNKNOWN, 8=OTHERS, 9=UNDER-MAINTENANCE
- When joining RM_RESOURCE_STATE, always alias rs.STATE AS STATE_LABEL to avoid 
  ambiguity with o.STATE (which is the numeric foreign key).
"""