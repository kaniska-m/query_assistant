def validate_query(query: str):
    query = query.strip().lower()

    if not query.startswith("select"):
        raise Exception("Only SELECT queries are allowed")

    forbidden = ["drop", "delete", "update", "insert", "truncate"]

    for word in forbidden:
        if word in query:
            raise Exception(f"Forbidden keyword detected: {word}")