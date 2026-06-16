import ResultTable from '../ResultTable';

export default function ResultsCard({ result, emptyMessage = 'Execute a query to see results here', emptyIcon = '◌' }) {
  if (!result) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-icon">{emptyIcon}</div>
            <p>{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <span className="card-title">Results</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="tag tag-green">{result.data?.length ?? 0} rows</span>
          {result.execution_time && (
            <span className="tag tag-amber">⏱ {result.execution_time}</span>
          )}
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <ResultTable
          columns={result.columns}
          data={result.data}
          execTime={result.execution_time}
          rowCount={result.data?.length}
        />
      </div>
    </div>
  );
}
