import chromadb
from sentence_transformers import SentenceTransformer
from app.services.metadata_service import get_columns
import os

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "../../../chroma_db")
COLLECTION_NAME = "oracle_schema"
MODEL_NAME = "all-MiniLM-L6-v2"

_model = None
_collection = None


def _load():
    global _model, _collection
    if _model is None:
        print("[Retriever] Loading embedding model (first time only)...")
        _model = SentenceTransformer(MODEL_NAME)
    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = client.get_collection(COLLECTION_NAME)
        print(f"[Retriever] Connected to ChromaDB. {_collection.count()} tables indexed.")


def get_relevant_schemas(user_query: str, top_k: int = 8) -> str:
    """
    Returns schema string for top_k relevant tables.
    Each table block explicitly lists ONLY columns that exist in Oracle.
    """
    _load()

    query_embedding = _model.encode(user_query).tolist()

    results = _collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["metadatas", "distances"]
    )

    table_names = [m["table_name"] for m in results["metadatas"][0]]
    distances = results["distances"][0]

    print(f"[Retriever] Top {top_k} tables for query '{user_query}':")
    for name, dist in zip(table_names, distances):
        print(f"  {name}  (distance: {dist:.4f})")

    schema_parts = []
    for table in table_names:
        cols = get_columns(table)
        if not cols:
            continue
        # Explicit column list with types — LLM must only use these
        col_lines = "\n".join(
            f"    - {c['name']} ({c['type']})" for c in cols
        )
        schema_parts.append(
            f"Table: {table}\n"
            f"Available columns (USE ONLY THESE EXACT NAMES):\n{col_lines}"
        )

    return "\n\n".join(schema_parts)


def is_ready() -> bool:
    try:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        col = client.get_collection(COLLECTION_NAME)
        return col.count() > 0
    except Exception:
        return False