from app.services.db_service import execute_query


def get_tables(db_name: str = "gemsdb"):
    query  = "SELECT table_name FROM user_tables ORDER BY table_name"
    result = execute_query(query, db_name)
    return [row[0] for row in result["data"]]


def get_columns(table: str, db_name: str = "gemsdb"):
    query = f"""
    SELECT column_name, data_type
    FROM user_tab_columns
    WHERE table_name = '{table.upper()}'
    ORDER BY column_id
    """
    result = execute_query(query, db_name)
    return [
        {"name": row[0], "type": row[1]}
        for row in result["data"]
    ]


def get_distinct_values(table: str, column: str, db_name: str = "gemsdb"):
    query = f"""
    SELECT DISTINCT {column}
    FROM {table}
    WHERE ROWNUM <= 50
    """
    result = execute_query(query, db_name)
    return [row[0] for row in result["data"]]