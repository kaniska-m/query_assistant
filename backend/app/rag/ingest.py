import chromadb
import csv
import os
from collections import defaultdict
from sentence_transformers import SentenceTransformer

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "../../../chroma_db")
COLLECTION_NAME = "oracle_schema"
MODEL_NAME = "all-MiniLM-L6-v2"

# Path to your schema CSV — place it in the backend folder
# CSV must have columns: TABLE_NAME, COLUMN_NAME, DATA_TYPE
SCHEMA_CSV_PATH = os.path.join(os.path.dirname(__file__), "../../../schema.csv")


def load_schema_from_csv(csv_path: str) -> dict:
    """
    Reads the CSV and returns:
    { "TABLE_NAME": [("COLUMN_NAME", "DATA_TYPE"), ...], ... }
    """
    tables = defaultdict(list)
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            table = row['TABLE_NAME'].strip().upper()
            column = row['COLUMN_NAME'].strip().upper()
            dtype = row['DATA_TYPE'].strip().upper()
            tables[table].append((column, dtype))
    print(f"[Ingest] Loaded {len(tables)} tables, "
          f"{sum(len(v) for v in tables.values())} columns from CSV.")
    return tables


def infer_table_purpose(table_name: str, col_names: list) -> str:
    """
    Infer semantic purpose from table name patterns + column presence.
    This is what makes the embedding understand WHAT the table is for.
    """
    name = table_name.upper()
    cols = set(col_names)
    purposes = []

    # --- Table name patterns ---
    if name.endswith("_HIST") or name.endswith("_HISTORY"):
        purposes.append("historical audit log past records changes over time")
    elif "_DAILY_" in name or name.endswith("_DAILY"):
        purposes.append("daily aggregated statistics per day")
    elif "_MONTHLY" in name:
        purposes.append("monthly aggregated statistics per month")
    elif "AVAILABILITY" in name or name.endswith("_AVL") or "_AVL_" in name:
        purposes.append("availability uptime downtime percentage")
    elif "OPTICAL_POWER" in name:
        purposes.append("optical power signal strength rx tx dbm reading level")
    elif "ALARM" in name and "HIST" not in name:
        purposes.append("active alarm fault alert event severity notification")
    elif "ALARM" in name and "HIST" in name:
        purposes.append("historical alarm fault cleared past events")
    elif "CONNECTION" in name and "HIST" not in name:
        purposes.append("active service connection bandwidth customer provisioned")
    elif "LOCATION" in name and "TYPE" not in name:
        purposes.append("location geography district state block panchayat zone")
    elif "MGMTDASH" in name or "DASHBOARD" in name:
        purposes.append("management dashboard summary operational status report")
    elif "CMVGP" in name or "BH_CMV" in name:
        purposes.append("BharatNet gram panchayat GP daily status bharatnet village rural")
    elif "BRDBND" in name or "BROADBAND" in name:
        purposes.append("broadband usage bandwidth subscriber count village")
    elif "NODESTATUS" in name:
        purposes.append("node status up down access nodes count")
    elif "UPCOUNT" in name:
        purposes.append("ONT up count increment GP panchayat")
    elif name.startswith("RM_OLT") and "HISTORY" not in name and "HIST" not in name:
        purposes.append("OLT optical line terminal device current state")
    elif name.startswith("RM_ONT") and "HISTORY" not in name and "HIST" not in name:
        purposes.append("ONT optical network terminal device current state active")
    elif "TEMP" in name or name.startswith("TEMP") or name.startswith("TMP"):
        purposes.append("temporary staging intermediate processing table")

    # --- Column presence hints ---
    if "APP_STATUS" in cols:
        purposes.append("device status active inactive working down state")
    if "PHY_STATE" in cols or "ACTUAL_PHY_STATUS" in cols:
        purposes.append("physical state status")
    if "ONT_STATE" in cols or "ACTUAL_ONT_STATE" in cols:
        purposes.append("ONT operational state value")
    if "OLT_STATE" in cols or "ACTUAL_OLT_STATE" in cols:
        purposes.append("OLT operational state value")
    if "SERIAL_NO" in cols or "ONT_SERIAL_NO" in cols:
        purposes.append("serial number unique device identifier")
    if "DISTRICT_NAME" in cols and "STATE_NAME" in cols:
        purposes.append("district state geography location hierarchy")
    if "PANCHAYAT_NAME" in cols or "BLOCK_NAME" in cols:
        purposes.append("panchayat block village rural location")
    if "PROB_CAUSE" in cols:
        purposes.append("alarm problem cause fault reason")
    if "DOWN_TYPE" in cols or "DOWN_CATEGORY" in cols:
        purposes.append("outage type category reason")
    if "BHARATNET" in cols:
        purposes.append("BharatNet flag rural connectivity")
    if "COMMISSION_DATE" in cols:
        purposes.append("commissioned installed provisioned new activation date")
    if "ACTIVE_COUNT" in cols or "PENDING_COUNT" in cols or "EXPIRED_COUNT" in cols:
        purposes.append("subscriber count active pending expired statistics")
    if "TOTAL_BW_MB" in cols or "DL_BW_MB" in cols:
        purposes.append("total bandwidth download upload MB usage")
    if "UP_ACCESS_NODES" in cols or "DOWN_ACCESS_NODES" in cols:
        purposes.append("access node up down count status")
    if "NMS_SEVERITY" in cols or "EMS_SEVERITY" in cols:
        purposes.append("severity critical major minor warning")
    if "OLT_IP" in cols:
        purposes.append("OLT IP address parent device")
    if "PON_ID" in cols and "PIC_ID" in cols:
        purposes.append("PON PIC port slot topology")
    if "LOCATION_ID" in cols:
        purposes.append("location mapped geographical")

    return " | ".join(purposes) if purposes else "general data table"


def build_table_document(table_name: str, col_tuples: list) -> str:
    """
    Build a rich text document for one table.
    col_tuples: [("COL_NAME", "DATA_TYPE"), ...]
    """
    col_names = [c[0] for c in col_tuples]
    col_with_types = ", ".join(f"{c[0]} ({c[1]})" for c in col_tuples)

    # Table name words for semantic matching
    name_words = table_name.replace("_", " ").lower()

    # Split column names into individual words
    col_words = " ".join(
        part.lower()
        for col in col_names
        for part in col.split("_")
    )

    purpose = infer_table_purpose(table_name, col_names)

    return (
        f"Table: {table_name}\n"
        f"Table name meaning: {name_words}\n"
        f"Purpose: {purpose}\n"
        f"Column keywords: {col_words}\n"
        f"All columns: {col_with_types}"
    )


def ingest(csv_path: str = None):
    if csv_path is None:
        csv_path = SCHEMA_CSV_PATH

    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"Schema CSV not found at: {csv_path}\n"
            f"Place your schema CSV at backend/schema.csv"
        )

    print(f"[Ingest] Reading schema from: {csv_path}")
    schema = load_schema_from_csv(csv_path)

    print("[Ingest] Loading embedding model...")
    model = SentenceTransformer(MODEL_NAME)

    print("[Ingest] Connecting to ChromaDB...")
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    try:
        client.delete_collection(COLLECTION_NAME)
        print("[Ingest] Cleared existing collection.")
    except Exception:
        pass

    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )

    tables = list(schema.items())
    print(f"[Ingest] Embedding {len(tables)} tables...")

    documents, embeddings, ids, metadatas = [], [], [], []
    batch_size = 50

    for i, (table_name, col_tuples) in enumerate(tables):
        try:
            doc = build_table_document(table_name, col_tuples)
            embedding = model.encode(doc).tolist()

            documents.append(doc)
            embeddings.append(embedding)
            ids.append(table_name)
            metadatas.append({
                "table_name": table_name,
                "column_count": len(col_tuples),
                "columns_csv": ",".join(c[0] for c in col_tuples)  # store for fast lookup
            })
        except Exception as e:
            print(f"[Ingest] WARNING: skipping {table_name}: {e}")
            continue

        if len(documents) >= batch_size:
            collection.add(
                documents=documents,
                embeddings=embeddings,
                ids=ids,
                metadatas=metadatas
            )
            print(f"[Ingest] Stored {i + 1}/{len(tables)}")
            documents, embeddings, ids, metadatas = [], [], [], []

    if documents:
        collection.add(
            documents=documents,
            embeddings=embeddings,
            ids=ids,
            metadatas=metadatas
        )

    total = collection.count()
    print(f"[Ingest] ✅ Complete. {total} tables indexed.")