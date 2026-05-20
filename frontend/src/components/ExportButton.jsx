// ── Format converters ─────────────────────────────────────────────

function toCSV(columns, data) {
  const escape = (val) => {
    if (val === null || val === undefined || val === 'None' || val === 'null') return '';
    const str = String(val);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const rows = data.map(row =>
    columns.map((col, i) => escape(Array.isArray(row) ? row[i] : row[col])).join(',')
  );
  return [columns.join(','), ...rows].join('\n');
}

function toTSV(columns, data) {
  const escape = (val) => {
    if (val === null || val === undefined || val === 'None' || val === 'null') return '';
    return String(val).replace(/\t/g, ' ');
  };
  const rows = data.map(row =>
    columns.map((col, i) => escape(Array.isArray(row) ? row[i] : row[col])).join('\t')
  );
  return [columns.join('\t'), ...rows].join('\n');
}

function toJSON(columns, data) {
  const records = data.map(row =>
    Object.fromEntries(
      columns.map((col, i) => {
        const val = Array.isArray(row) ? row[i] : row[col];
        return [col, (val === null || val === undefined || val === 'None' || val === 'null') ? null : val];
      })
    )
  );
  return JSON.stringify(records, null, 2);
}

function toSQL(columns, data, tableName = 'query_results') {
  const escape = (val) => {
    if (val === null || val === undefined || val === 'None' || val === 'null') return 'NULL';
    return `'${String(val).replace(/'/g, "''")}'`;
  };
  const colList = columns.join(', ');
  const inserts = data.map(row => {
    const vals = columns.map((col, i) => escape(Array.isArray(row) ? row[i] : row[col])).join(', ');
    return `INSERT INTO ${tableName} (${colList}) VALUES (${vals});`;
  });
  return [`-- Exported from QueryAssist — ${new Date().toISOString()}`, ...inserts].join('\n');
}

function toXML(columns, data) {
  const esc = (val) => {
    if (val === null || val === undefined || val === 'None' || val === 'null') return '';
    return String(val)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  const tag = (n) => n.replace(/[^a-zA-Z0-9_]/g, '_');
  const rows = data.map(row => {
    const fields = columns.map((col, i) =>
      `    <${tag(col)}>${esc(Array.isArray(row) ? row[i] : row[col])}</${tag(col)}>`
    ).join('\n');
    return `  <row>\n${fields}\n  </row>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<results>\n${rows}\n</results>`;
}

function toHTML(columns, data) {
  const esc = (val) => {
    if (val === null || val === undefined || val === 'None' || val === 'null') return '';
    return String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const headers = columns.map(c => `<th>${esc(c)}</th>`).join('');
  const rows = data.map(row =>
    `<tr>${columns.map((col, i) => `<td>${esc(Array.isArray(row) ? row[i] : row[col])}</td>`).join('')}</tr>`
  ).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Query Results</title>
<style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%}
th{background:#f0f0f0;padding:8px 12px;text-align:left;border:1px solid #ddd}
td{padding:6px 12px;border:1px solid #ddd;font-size:13px}
tr:nth-child(even){background:#fafafa}</style></head>
<body><h2>Query Results (${data.length} rows)</h2>
<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
<p style="color:#999;font-size:12px">Exported — ${new Date().toISOString()}</p>
</body></html>`;
}

// ── Download helper ───────────────────────────────────────────────

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Format map ────────────────────────────────────────────────────

const FORMATS = {
  csv:  { label: 'CSV (.csv)',         ext: 'csv',  mime: 'text/csv;charset=utf-8;',   fn: toCSV  },
  tsv:  { label: 'Excel / TSV (.tsv)', ext: 'tsv',  mime: 'text/tab-separated-values', fn: toTSV  },
  json: { label: 'JSON (.json)',        ext: 'json', mime: 'application/json',          fn: toJSON },
  sql:  { label: 'SQL Inserts (.sql)', ext: 'sql',  mime: 'text/plain;charset=utf-8;', fn: toSQL  },
  xml:  { label: 'XML (.xml)',         ext: 'xml',  mime: 'application/xml',           fn: toXML  },
  html: { label: 'HTML Table (.html)', ext: 'html', mime: 'text/html;charset=utf-8;',  fn: toHTML },
};

// ── Component ─────────────────────────────────────────────────────

export default function ExportButton({ columns = [], data = [] }) {
  const disabled = !columns.length || !data.length;
  const ts = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  const handleChange = (e) => {
    const fmt = FORMATS[e.target.value];
    if (!fmt) return;
    const content = fmt.fn(columns, data);
    download(`query-results-${ts()}.${fmt.ext}`, content, fmt.mime);
    // reset select back to placeholder
    e.target.value = '';
  };

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <select
        className="form-control"
        onChange={handleChange}
        disabled={disabled}
        defaultValue=""
        title={disabled ? 'Execute a query first' : `Export ${data.length} rows`}
        style={{ minWidth: 160 }}
      >
        <option value="" disabled>
          {disabled ? '↓ Export' : `↓ Export (${data.length} rows)`}
        </option>
        {Object.entries(FORMATS).map(([id, fmt]) => (
          <option key={id} value={id}>{fmt.label}</option>
        ))}
      </select>
    </div>
  );
}