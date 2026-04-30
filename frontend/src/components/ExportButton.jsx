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
  
  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  export default function ExportButton({ columns = [], data = [] }) {
    const disabled = !columns.length || !data.length;
    const ts = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  
    const exportCSV = () => {
      download(`query-results-${ts()}.csv`, toCSV(columns, data), 'text/csv;charset=utf-8;');
    };
  
    return (
      <button
        className="btn btn-secondary"
        onClick={exportCSV}
        disabled={disabled}
        title={disabled ? 'Execute a query first' : `Export ${data.length} rows as CSV`}
      >
        ↓ Export CSV
      </button>
    );
  }