import { useState } from 'react';
import { api } from '../api/api';
import ResultTable from '../components/ResultTable';

export default function HistoryPage({ history, onAddHistory }) {
  const [expanded, setExpanded] = useState(null);
  const [running, setRunning] = useState(null);
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);

  const runQuery = async (i, sql) => {
    setRunning(i);
    setExpanded(i);
    setError(null);
    try {
      const res = await api.executeSQL(sql);
      setResults(prev => ({ ...prev, [i]: res }));
      onAddHistory?.({ sql, timestamp: new Date().toISOString(), execTime: res.execution_time });
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(null);
    }
  };

  const fmt = (ts) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
    } catch { return ts; }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">⊙ Query History</div>
          <div className="page-subtitle">{history.length} queries executed this session</div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}

      <div className="card">
        {history.length === 0 ? (
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">⊙</div>
              <p>No queries have been executed yet.</p>
              <p style={{ marginTop: 6 }}>Queries run from any page will appear here.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="card-header" style={{ background: 'var(--bg-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px 120px', gap: 12, width: '100%', fontSize: 10, letterSpacing: '1px', color: 'var(--amber)', textTransform: 'uppercase' }}>
                <span>Timestamp</span>
                <span>Query</span>
                <span>Time</span>
                <span>Actions</span>
              </div>
            </div>
            {[...history].reverse().map((item, i) => {
              const realIdx = history.length - 1 - i;
              const isExpanded = expanded === realIdx;
              const res = results[realIdx];

              return (
                <div key={realIdx}>
                  <div className="history-row">
                    <span className="history-ts">{fmt(item.timestamp)}</span>
                    <span
                      className="history-sql"
                      title={item.sql}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpanded(isExpanded ? null : realIdx)}
                    >
                      {item.sql}
                    </span>
                    <span className="tag tag-amber" style={{ justifySelf: 'start' }}>
                      {item.execTime || '—'}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => setExpanded(isExpanded ? null : realIdx)}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => runQuery(realIdx, item.sql)}
                        disabled={running === realIdx}
                      >
                        {running === realIdx ? <div className="spinner" /> : '▶ Run'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-0)' }}>
                      <pre className="sql-block" style={{ marginBottom: res ? 12 : 0 }}>
                        {item.sql}
                      </pre>
                      {res && (
                        <div className="card" style={{ marginTop: 12 }}>
                          <div className="card-header" style={{ justifyContent: 'space-between' }}>
                            <span className="card-title">Results</span>
                            <span className="tag tag-green">{res.data?.length ?? 0} rows</span>
                          </div>
                          <div style={{ padding: 0 }}>
                            <ResultTable columns={res.columns} data={res.data} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
