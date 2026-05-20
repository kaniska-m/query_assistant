from app.services.metadata_service import get_columns
from app.config.settings import MAX_ROWS

ALLOWED_OPERATORS = [
    "=", "!=", ">", "<", ">=", "<=",
    "LIKE", "IN", "BETWEEN",
    "IS NULL", "IS NOT NULL"
]


def format_value(val):
    if isinstance(val, str):
        return f"'{val}'"
    return str(val)


def build_condition(cond, valid_columns):
    col = cond.get("column", "").upper()
    op = cond.get("operator")
    val = cond.get("value")
    raw = cond.get("raw", False)   # if True, value is already SQL (e.g. TO_DATE(...))

    if not col:
        return None

    if col not in valid_columns:
        raise Exception(f"Invalid column: {col}")

    if op not in ALLOWED_OPERATORS:
        raise Exception(f"Invalid operator: {op}")

    if op in ["IS NULL", "IS NOT NULL"]:
        return f"{col} {op}"

    if op == "IN":
        if isinstance(val, str):
            val = [v.strip() for v in val.split(",")]
        if not isinstance(val, list):
            raise Exception("IN requires list")
        values = ", ".join(format_value(v) for v in val)
        return f"{col} IN ({values})"

    if op == "BETWEEN":
        v1 = cond.get("value1", "")
        v2 = cond.get("value2", "")
        if not v1 or not v2:
            return None
        return f"{col} BETWEEN {format_value(v1)} AND {format_value(v2)}"

    # raw=True means value is already valid SQL — check BEFORE the not-val guard
    if raw:
        if not val:
            return None
        return f"{col} {op} {val}"

    if not val and val != 0:
        return None

    return f"{col} {op} {format_value(val)}"


def build_date_range_groups(groups, valid_columns):
    """
    Builds per-row:
      (SERIAL_NO = 'X' AND MARK_FOR_MAINTENANCE >= TO_DATE('01-11-2025','DD-MM-YYYY') AND MARK_FOR_MAINTENANCE <= TO_DATE('01-12-2025','DD-MM-YYYY'))
    All rows joined with OR.
    Skips column validation for raw date expressions so Oracle handles the type.
    """
    clauses = []
    for group in groups:
        logic = group.get("logic", "AND").upper()
        parts = []
        for cond in group.get("conditions", []):
            col = cond.get("column", "").upper()
            op  = cond.get("operator", "")
            val = cond.get("value", "")
            is_raw = cond.get("raw", False)

            if not col or not op or not val:
                continue

            if op not in ALLOWED_OPERATORS:
                continue

            if is_raw:
                # Value is already Oracle SQL expression — use as-is
                parts.append(f"{col} {op} {val}")
            else:
                parts.append(f"{col} {op} {format_value(val)}")

        if parts:
            clauses.append("(" + f" {logic} ".join(parts) + ")")
    return " OR ".join(clauses)


def build_filter_group(group, valid_columns):
    logic = group.get("logic", "AND").upper()
    conditions = group.get("conditions", [])

    if logic not in ["AND", "OR"]:
        raise Exception("Invalid logic")

    parts = []
    for item in conditions:
        if "conditions" in item:
            sub = build_filter_group(item, valid_columns)
            if sub:
                parts.append(f"({sub})")
        else:
            cond = build_condition(item, valid_columns)
            if cond:  # only add non-None conditions
                parts.append(cond)

    return f" {logic} ".join(parts)  # returns "" if no valid conditions


def build_query(payload):
    table = payload["table"].upper()
    columns = payload.get("columns", ["*"])
    filters = payload.get("filters")
    order_by = payload.get("order_by")      # can be string or dict
    order_dir = payload.get("order_dir", "ASC").upper()
    limit = payload.get("limit", MAX_ROWS)

    db_name = payload.get("db_name", "gemsdb")
    valid_columns = [col["name"].upper() for col in get_columns(table, db_name)]

    # columns can be list of strings or list of dicts — normalise
    if columns and isinstance(columns[0], dict):
        columns = [c["name"] for c in columns]

    for col in columns:
        if col != "*" and col.upper() not in valid_columns:
            raise Exception(f"Invalid column: {col}")

    col_str = ", ".join(columns) if columns != ["*"] else "*"
    query = f"SELECT {col_str} FROM {table}"

    # Build WHERE clause only if there are valid conditions
    where_parts = []

    if filters:
        date_range_groups = filters.get("dateRangeGroups")
        if date_range_groups:
            dr_sql = build_date_range_groups(date_range_groups, valid_columns)
            if dr_sql.strip():
                where_parts.append(f"({dr_sql})")
        else:
            filter_sql = build_filter_group(filters, valid_columns)
            if filter_sql.strip():
                where_parts.append(filter_sql)

    # Always add ROWNUM limit
    limit = min(int(limit), MAX_ROWS)
    where_parts.append(f"ROWNUM <= {limit}")

    query += " WHERE " + " AND ".join(where_parts)

    # ORDER BY — accept both string and dict from frontend
    if order_by:
        if isinstance(order_by, dict):
            col = order_by.get("column", "").upper()
            direction = order_by.get("direction", "ASC").upper()
        else:
            col = str(order_by).upper()
            direction = order_dir

        if col and col in valid_columns:
            if direction not in ["ASC", "DESC"]:
                direction = "ASC"
            query += f" ORDER BY {col} {direction}"

    return query