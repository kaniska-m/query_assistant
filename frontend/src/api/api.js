const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── DB list ───────────────────────────────────────────────────
  getDatabases: () =>
    request("GET", "/databases"),

  // ── Metadata — db_name passed as query param ─────────────────
  getTables: (db_name) =>
    request("GET", `/tables?db_name=${encodeURIComponent(db_name)}`),

  getColumns: (table, db_name) =>
    request("GET", `/tables/${table}/columns?db_name=${encodeURIComponent(db_name)}`),

  getColumnValues: (table, column, db_name) =>
    request("GET", `/tables/${table}/columns/${column}/values?db_name=${encodeURIComponent(db_name)}`),

  // ── Query builder — db_name inside POST body ─────────────────
  generateQuery: (payload) =>
    request("POST", "/query-builder/generate", payload),
  // Note: payload must include db_name field

  executeBuilderQuery: (payload) =>
    request("POST", "/query-builder/execute", payload),
  // Note: payload must include db_name field

  // ── NL to SQL ─────────────────────────────────────────────────
  nlToSQL: (prompt, db_name) =>
    request("POST", "/nl-to-sql", { prompt, db_name }),

  // ── Direct SQL executor ───────────────────────────────────────
  executeSQL: (sql, db_name) =>
    request("POST", "/execute_sql", { query: sql, db_name }),
};