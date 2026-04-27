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

    if col not in valid_columns:
        raise Exception(f"Invalid column: {col}")

    if op not in ALLOWED_OPERATORS:
        raise Exception(f"Invalid operator: {op}")

    if op in ["IS NULL", "IS NOT NULL"]:
        return f"{col} {op}"

    if op == "IN":
        if not isinstance(val, list):
            raise Exception("IN requires list")
        values = ", ".join(format_value(v) for v in val)
        return f"{col} IN ({values})"

    if op == "BETWEEN":
        if not isinstance(val, list) or len(val) != 2:
            raise Exception("BETWEEN requires 2 values")
        return f"{col} BETWEEN {format_value(val[0])} AND {format_value(val[1])}"

    return f"{col} {op} {format_value(val)}"


def build_filter_group(group, valid_columns):
    logic = group.get("logic", "AND").upper()
    conditions = group.get("conditions", [])

    if logic not in ["AND", "OR"]:
        raise Exception("Invalid logic")

    parts = []

    for item in conditions:
        if "conditions" in item:
            parts.append(f"({build_filter_group(item, valid_columns)})")
        else:
            parts.append(build_condition(item, valid_columns))

    return f" {logic} ".join(parts)


def build_query(payload):
    table = payload["table"].upper()
    columns = payload.get("columns", ["*"])
    filters = payload.get("filters")
    order_by = payload.get("order_by")
    limit = payload.get("limit", MAX_ROWS)

    valid_columns = [col["name"] for col in get_columns(table)]

    for col in columns:
        if col != "*" and col.upper() not in valid_columns:
            raise Exception(f"Invalid column: {col}")

    query = f"SELECT {', '.join(columns) if columns != ['*'] else '*'} FROM {table}"

    if filters:
        query += f" WHERE {build_filter_group(filters, valid_columns)}"

    if order_by:
        col = order_by["column"].upper()
        direction = order_by.get("direction", "ASC").upper()

        if col not in valid_columns:
            raise Exception("Invalid order column")

        if direction not in ["ASC", "DESC"]:
            raise Exception("Invalid order direction")

        query += f" ORDER BY {col} {direction}"

    limit = min(limit, MAX_ROWS)

    if "WHERE" in query:
        query = query.replace("ORDER BY", f" AND ROWNUM <= {limit} ORDER BY") \
            if "ORDER BY" in query else query + f" AND ROWNUM <= {limit}"
    else:
        query = query.replace("ORDER BY", f" WHERE ROWNUM <= {limit} ORDER BY") \
            if "ORDER BY" in query else query + f" WHERE ROWNUM <= {limit}"

    return query