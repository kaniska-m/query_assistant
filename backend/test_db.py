import oracledb

oracledb.init_oracle_client(
    lib_dir="/home/trainee/oracle_client/instantclient_23_26"
)

conn = oracledb.connect(
    user="nofnnmsrm",   # ✅ FIXED
    password="nofnnmsrm123",
    dsn="localhost:1521/gemsdb"
)

cursor = conn.cursor()
cursor.execute("SELECT * FROM dual")

print(cursor.fetchall())

cursor.close()
conn.close()