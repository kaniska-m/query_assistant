import oracledb
from app.config.db_config import get_db_config

# Initialize Oracle client once at import time
oracledb.init_oracle_client(
    lib_dir="/home/trainee/oracle_client/instantclient_23_26"
)

def get_connection(db_name: str):
    """
    Returns an Oracle connection for the given db_name.
    Credentials are read from db_config.py.
    """
    cfg = get_db_config(db_name)
    dsn = f"{cfg['host']}:{cfg['port']}/{cfg['service']}"
    return oracledb.connect(
        user=cfg["user"],
        password=cfg["password"],
        dsn=dsn,
    )

def execute_query(query: str, db_name: str = "gemsdb"):
    """
    Executes a SELECT query on the given database.
    Returns { columns: [...], data: [[...], ...] }
    """
    conn   = get_connection(db_name)
    cursor = conn.cursor()

    cursor.execute(query)

    columns = [col[0] for col in cursor.description]
    rows    = cursor.fetchall()
    data    = [list(map(str, row)) for row in rows]

    cursor.close()
    conn.close()

    return {
        "columns": columns,
        "data":    data,
    }