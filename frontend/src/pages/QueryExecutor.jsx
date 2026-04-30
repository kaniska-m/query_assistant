import { useState } from 'react';
import { api } from '../api/api';
import ResultTable from '../components/ResultTable';
import ExportButton from '../components/ExportButton';

const EXAMPLE_QUERIES = [
  'SELECT * FROM RM_ONT WHERE ROWNUM <= 5',
  'SELECT ROWNUM FROM RM_OLT WHERE ROWNUM <= 5',
  'SELECT * FROM RM_ALARM WHERE ROWNUM <= 5',
];


export default function QueryExecutor({ onAddHistory }) {
  const [sql, setSql] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.executeSQL(sql);
      setResult(res);
      onAddHistory?.({ sql, timestamp: new Date().toISOString(), execTime: res.execution_time });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') execute();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">⌨ SQL Executor</div>
          <div className="page-subtitle">Run raw SQL queries — Ctrl+Enter to execute</div>
        </div>
      </div>

      <div className="split-layout">
        {/* Left: Editor */}
        <div className="section-gap">
          <div className="card">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <span className="card-title">Query Editor</span>
              <span className="tag tag-blue">gemsdb</span>
            </div>
            <div className="card-body">
              <textarea
                className="form-control"
                style={{ minHeight: 200, fontFamily: 'var(--mono)', fontSize: 13 }}
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={"-- Write your SQL here\nSELECT * FROM RM_ONT WHERE STATUS = 'ACTIVE' AND ROWNUM <= 50;"}
                spellCheck={false}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={execute} disabled={loading || !sql.trim()}>
                {loading ? <><div className="spinner" /> Running...</> : '▶ Execute'}
              </button>
              <button className="btn btn-ghost" onClick={() => { setSql(''); setResult(null); setError(null); }}>
                ✕ Clear
              </button>
              <ExportButton
                columns={result?.columns || []}
                data={result?.data || []}
              />
            </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Examples</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {EXAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  className="btn btn-ghost"
                  style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: 11, fontFamily: 'var(--mono)' }}
                  onClick={() => setSql(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="section-gap">
          {error && <div className="alert alert-error">⚠ {error}</div>}

          {result ? (
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <span className="card-title">Results</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="tag tag-green">{result.data?.length ?? 0} rows</span>
                  {result.execution_time && <span className="tag tag-amber">⏱ {result.execution_time}</span>}
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
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-icon">◌</div>
                  <p>Execute a query to see results here</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}