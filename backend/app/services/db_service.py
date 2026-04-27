import oracledb

# initialize once
oracledb.init_oracle_client(
    lib_dir="/home/trainee/oracle_client/instantclient_23_26"
)

def get_connection():
    return oracledb.connect(
        user="nofnnmsrm",
        password="nofnnmsrm123",
        dsn="localhost:1521/gemsdb"
    )

def execute_query(query):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(query)

    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    data = [list(map(str, row)) for row in rows]
    cursor.close()
    conn.close()

    return {
        "columns": columns,
        "data": data
    }