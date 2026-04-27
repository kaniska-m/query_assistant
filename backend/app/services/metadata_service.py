from app.services.db_service import execute_query


def get_tables():
    query = "SELECT table_name FROM user_tables"
    result = execute_query(query)
    return [row[0] for row in result["data"]]


def get_columns(table: str):
    query = f"""
    SELECT column_name, data_type
    FROM user_tab_columns
    WHERE table_name = '{table.upper()}'
    """
    result = execute_query(query)

    return [
        {"name": row[0], "type": row[1]}
        for row in result["data"]
    ]


def get_distinct_values(table: str, column: str):
    query = f"""
    SELECT DISTINCT {column}
    FROM {table}
    WHERE ROWNUM <= 50
    """
    result = execute_query(query)

    return [row[0] for row in result["data"]]