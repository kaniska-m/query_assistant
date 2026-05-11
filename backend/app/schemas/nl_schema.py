# Single source of truth for all NL query tables and joins

PRIMARY_TABLES = ["RM_ONT", "RM_ONT_HISTORY"]

JOINABLE_TABLES = [
    {
    "table": "RM_ONT_AVAILABILITY",
    "columns": ["ONT_SERIAL_NO", "DOWN_TIME", "UP_TIME", "REMARKS", "TIME_STAMP"],
    "join_on": {
        "from_table": "RM_ONT",
        "from_col": "SERIAL_NO",
        "to_col": "ONT_SERIAL_NO",
    },
    "use_when": ["availability", "uptime", "downtime", "outage", "sla"],
    "description": "ONT availability records with up/down timestamps",
},
    {
        "table": "RM_ALARM",
        "columns": [
            "ID", "NOTIF_ID", "NE_TIME", "OBJ_NAME", "OBJ_TYPE",
            "RES_NAME", "PERC_SEVERITY", "NMS_SEVERITY", "PROB_CAUSE",
        ],
        "join_on": {
            "from_table": "RM_ONT",
            "from_col": "NAME",
            "to_col": "RES_NAME",
        },
        "use_when": ["alarm", "fault", "severity", "alert", "event", "critical", "major"],
        "description": "Active alarms and fault events",
    },
    {
        "table": "APP_RM_LOCATION",
        "columns": ["ID", "LOCATION_NAME", "DISTRICT", "STATE", "LOCATION_TYPE"],
        "join_on": {
            "from_table": "RM_ONT",
            "from_col": "LOCATION_ID",
            "to_col": "ID",
        },
        "use_when": ["location", "district", "region", "area", "city", "where"],
        "description": "Geographic location details",
    },
    {
        "table": "RM_OLT_PICPON_MAP",
        "columns": ["ID", "OLT_ID", "PIC_ID", "PON_ID"],
        "join_on": {
            "from_table": "RM_ONT",
            "from_col": "OLT_PIC_PON_ID",
            "to_col": "ID",
        },
        "use_when": ["olt", "pon", "pic", "topology", "connected to", "network path"],
        "description": "OLT PIC PON mapping for network topology",
    },
    {
        "table": "RM_ONT_UNI_PORT",
        "columns": [
            "PORT_ID", "ONT_NAME", "PORT_TYPE", "STATE",
            "PORT_MODE", "CARD_TYPE", "RES_FULL_FILL_STATE",
        ],
        "join_on": {
            "from_table": "RM_ONT",
            "from_col": "NAME",
            "to_col": "ONT_NAME",
        },
        "use_when": ["uni", "port", "service port", "card"],
        "description": "UNI ports attached to ONTs",
    },
    {
        "table": "RM_ONT_OPTICAL_POWER",
        "columns": ["ONT_NAME", "RX_POWER", "TX_POWER", "TIME_STAMP"],
        "join_on": {
            "from_table": "RM_ONT",
            "from_col": "NAME",
            "to_col": "ONT_NAME",
        },
        "use_when": ["optical", "power", "rx", "tx", "signal", "dbm"],
        "description": "Optical power readings for ONTs",
    },
    {
        "table": "RM_VENDOR",
        "columns": ["ID", "VENDOR_NAME"],
        "join_on": {
            "from_table": "RM_ONT",
            "from_col": "VENDOR",
            "to_col": "ID",
        },
        "use_when": ["vendor", "manufacturer", "brand"],
        "description": "Vendor/manufacturer details",
    },
    {
    "table": "RM_RESOURCE_STATE",
    "columns": ["ID", "STATE"],  # ← was STATE_NAME, correct is STATE
    "join_on": {
        "from_table": "RM_ONT",
        "from_col": "STATE",
        "to_col": "ID",
    },
    "use_when": ["state", "state name", "up", "down", "unreachable", "unhealthy",
                 "under maintenance", "working", "unknown", "non-working"],
    "description": "Human-readable ONT state: 0=DOWN, 1=UP, 2=UNREACHABLE, 3=UNHEALTHY, 4=WORKING-ACTIVATED, 5=WORKING-DEACTIVATED, 6=NON-WORKING, 7=UNKNOWN, 8=OTHERS, 9=UNDER-MAINTENANCE",
},
    {
        "table": "RM_ONT_TYPE",
        "columns": ["ID", "TYPE_NAME", "TYPE_DESC"],
        "join_on": {
            "from_table": "RM_ONT",
            "from_col": "TYPE",
            "to_col": "ID",
        },
        "use_when": ["type name", "ont type", "device type", "model"],
        "description": "ONT type and model descriptions",
    },
]