import { useState } from 'react';
import { api } from '../api/api';
import QueryPreview from '../components/QueryPreview';
import ResultTable from '../components/ResultTable';

const EXAMPLES = [
  'Show all active ONT devices from the last 30 days',
  'Find all OLT entries where status is DOWN, ordered by date',
  'Count devices grouped by status',
];

export default function NLQueryPage({ onAddHistory }) {
  const [prompt, setPrompt] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState(null);

  // Replace the generateFromNL function:
  const generateFromNL = async () => {
  if (!prompt.trim()) return;
  setGenerating(true);
  setError(null);
  setGeneratedSQL('');
  setResult(null);

  try {
    const res = await api.nlToSQL(prompt);
    setGeneratedSQL(res.query);
  } catch (e) {
    setError(e.message);
  } finally {
    setGenerating(false);
  }

  };

  const execute = async () => {
    if (!generatedSQL) return;
    setExecuting(true);
    setError(null);
    try {
      const res = await api.executeSQL(generatedSQL);
      setResult(res);
      onAddHistory?.({ sql: generatedSQL, timestamp: new Date().toISOString(), execTime: res.execution_time });
    } catch (e) {
      setError(e.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">◈ Natural Language Query</div>
          <div className="page-subtitle">Describe what you want — SQL is generated automatically</div>
        </div>
        <span className="tag tag-amber" style={{ marginLeft: 'auto' }}>Beta</span>
      </div>

      <div className="split-layout">
        {/* Left: Input */}
        <div className="section-gap">
          <div className="card">
            <div className="card-header"><span className="card-title">Your Request</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Describe your query in plain English</label>
                <textarea
                  className="form-control"
                  style={{ minHeight: 120 }}
                  placeholder="e.g. Show me all active devices added in the last week, sorted by date..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generateFromNL(); }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary" onClick={generateFromNL} disabled={generating || !prompt.trim()}>
                  {generating ? <><div className="spinner" /> Generating...</> : '◈ Generate SQL'}
                </button>
                {generatedSQL && (
                  <button className="btn btn-green" onClick={execute} disabled={executing}>
                    {executing ? <><div className="spinner" /> Executing...</> : '▶ Execute'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Example Prompts</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  className="btn btn-ghost"
                  style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: 12 }}
                  onClick={() => setPrompt(ex)}
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Status</span></div>
            <div className="card-body">
              <div className="alert alert-info">
                ℹ NL-to-SQL endpoint is mocked. Connect your AI backend at <code style={{ color: 'var(--blue)' }}>POST /nl-to-sql</code> when ready.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Output */}
        <div className="section-gap">
          {error && <div className="alert alert-error">⚠ {error}</div>}

          <QueryPreview sql={generatedSQL} />

          {result ? (
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <span className="card-title">Results</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="tag tag-green">{result.data?.length ?? 0} rows</span>
                  {result.execution_time && <span className="tag tag-amber">⏱ {result.execution_time}</span>}
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <ResultTable columns={result.columns} data={result.data} />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-icon">◈</div>
                  <p>Generated SQL and results will appear here</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
