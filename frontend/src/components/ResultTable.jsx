export default function ResultTable({ columns = [], data = [], execTime, rowCount }) {
  if (!columns.length) return null;

  const rows = data.map((row) => {
    if (Array.isArray(row)) {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    }
    return row;
  });

  const displayVal = (v) => {
    if (v === null || v === undefined || v === 'None' || v === 'null') {
      return <span style={{ color: 'var(--text-2)' }}>NULL</span>;
    }
    return String(v);
  };

  return (
    <div>
      {(execTime || rowCount !== undefined) && (
        <div className="exec-meta">
          {rowCount !== undefined && <span className="count">↳ {rowCount} row{rowCount !== 1 ? 's' : ''}</span>}
          {execTime && <span className="time">⏱ {execTime}</span>}
        </div>
      )}
      <div className="result-table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              {columns.map((col) => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-2)' }}>
                  No rows returned
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col} title={String(row[col] ?? '')}>{displayVal(row[col])}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}