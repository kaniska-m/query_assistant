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
  getTables: () => request("GET", "/tables"),
  getColumns: (table) => request("GET", `/tables/${table}/columns`),
  getColumnValues: (table, column) =>
    request("GET", `/tables/${table}/columns/${column}/values`),
  generateQuery: (payload) => request("POST", "/query-builder/generate", payload),
  executeBuilderQuery: (payload) => request("POST", "/query-builder/execute", payload),
  nlToSQL: (prompt) => request("POST", "/nl-to-sql", { prompt }),
  executeSQL: (sql) => request("POST", "/execute_sql", { query: sql }),
};
