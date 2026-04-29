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

    if not col:
        return None  # skip empty rows

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
            return None  # skip incomplete BETWEEN
        return f"{col} BETWEEN {format_value(v1)} AND {format_value(v2)}"

    if not val and val != 0:
        return None  # skip filter with no value

    return f"{col} {op} {format_value(val)}"


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

    valid_columns = [col["name"].upper() for col in get_columns(table)]

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
        filter_sql = build_filter_group(filters, valid_columns)
        if filter_sql.strip():  # only add WHERE if something was built
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