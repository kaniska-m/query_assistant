import { useState } from 'react';
import { useQueryExecution } from '../hooks/useQueryExecution';
import PageHeader from '../components/ui/PageHeader';
import ResultsCard from '../components/ui/ResultsCard';
import ExportButton from '../components/ExportButton';

const EXAMPLE_QUERIES = [
  'SELECT * FROM RM_ONT WHERE ROWNUM <= 5',
  'SELECT ROWNUM FROM RM_OLT WHERE ROWNUM <= 5',
  'SELECT * FROM RM_ALARM WHERE ROWNUM <= 5',
];

export default function QueryExecutor({ onAddHistory, selectedDb }) {
  const [sql, setSql] = useState('');
  const { result, executing, error, execute } = useQueryExecution(onAddHistory, selectedDb);

  const clear = () => setSql('');

  return (
    <div className="page-content">
      <PageHeader icon="⌨" title="SQL Executor" subtitle="Run raw SQL queries — Ctrl+Enter to execute" />

      {!selectedDb && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠ No database selected — go to <a href="/" style={{ color: 'var(--amber)' }}>Home</a> and choose a database first.
        </div>
      )}

      <div className="split-layout">
        {/* Left: Editor */}
        <div className="section-gap">
          <div className="card">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <span className="card-title">Query Editor</span>
              <span className="tag tag-blue">{selectedDb || 'no db'}</span>
            </div>
            <div className="card-body">
              <textarea
                className="form-control"
                style={{ minHeight: 200, fontFamily: 'var(--mono)', fontSize: 13 }}
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') execute(sql); }}
                placeholder={"-- Write your SQL here\nSELECT * FROM RM_ONT WHERE ROWNUM <= 50"}
                spellCheck={false}
                disabled={!selectedDb}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => execute(sql)}
                  disabled={executing || !sql.trim() || !selectedDb}
                >
                  {executing ? <><div className="spinner" /> Running...</> : '▶ Execute'}
                </button>
                <button className="btn btn-ghost" onClick={clear}>✕ Clear</button>
                <ExportButton columns={result?.columns || []} data={result?.data || []} />
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
          <ResultsCard result={result} />
        </div>
      </div>
    </div>
  );
}
