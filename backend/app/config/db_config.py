# ── Database Configuration ────────────────────────────────────────
# Add new databases here. The key is the db_name the frontend sends.
# Format:
#   "db_name": {
#       "user":     "oracle_username",
#       "password": "oracle_password",
#       "host":     "hostname_or_ip",
#       "port":     1521,
#       "service":  "oracle_service_name",
#       "label":    "Display name shown in UI",
#       "description": "Short description shown in UI",
#   }

DATABASES = {
    "gemsdb": {
        "user":        "nofnnmsrm",
        "password":    "nofnnmsrm123",
        "host":        "localhost",
        "port":        1521,
        "service":     "gemsdb",
        "label":       "GEMS DB",
        "description": "Primary network management database",
    },

    
    "testdb": {
        "user":        "testuser",
        "password":    "testpass",
        "host":        "192.168.1.100",
        "port":        1521,
        "service":     "testdb",
        "label":       "Test DB",
        "description": "Testing environment",
    },
}

def get_db_config(db_name: str) -> dict:
    """Returns config dict for the given db_name. Raises if not found."""
    config = DATABASES.get(db_name)
    if not config:
        available = list(DATABASES.keys())
        raise ValueError(
            f"Database '{db_name}' not found in config. "
            f"Available: {available}"
        )
    return config

def get_all_db_names() -> list:
    """Returns list of all configured database names with labels."""
    return [
        {
            "name":        key,
            "label":       val["label"],
            "description": val["description"],
        }
        for key, val in DATABASES.items()
    ]