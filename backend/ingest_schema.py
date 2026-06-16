import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.rag.ingest import ingest

if __name__ == "__main__":
    # Optional: pass CSV path as argument
    # Usage: python ingest_schema.py
    # Or:    python ingest_schema.py /path/to/schema.csv
    csv_path = sys.argv[1] if len(sys.argv) > 1 else None
    ingest(csv_path=csv_path)