import { useState } from 'react';
import { api } from '../api/api';
import QueryPreview from '../components/QueryPreview';
import ResultTable from '../components/ResultTable';
import ExportButton from '../components/ExportButton';  

const EXAMPLES = [
  'Show 10 active ONTs from RM_ONT where APP_STATUS is Active and the ont_id is 123',
  'Find RM_ONT_HISTORY records for serial number CDTB-88:0:0:13 in 2019',
  'Count RM_ONT records grouped by APP_STATUS',
  'Show RM_ONT where PHY_STATUS is ACTIVATED ordered by TIME_STAMP',
];

export default function NLQueryPage({ onAddHistory }) {
  const [prompt, setPrompt] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [editSQL, setEditSQL] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState(null);

  const generateFromNL = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setGeneratedSQL('');
    setEditSQL('');
    setIsEditing(false);
    setResult(null);
    try {
      const res = await api.nlToSQL(prompt);
      const sql = res.query || res.sql || '';
      setGeneratedSQL(sql);
      setEditSQL(sql);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const execute = async () => {
    const sqlToRun = isEditing ? editSQL : generatedSQL;
    if (!sqlToRun) return;
    setExecuting(true);
    setError(null);
    try {
      const res = await api.executeSQL(sqlToRun);
      setResult(res);
      onAddHistory?.({ sql: sqlToRun, timestamp: new Date().toISOString(), execTime: res.execution_time });
    } catch (e) {
      setError(e.message);
    } finally {
      setExecuting(false);
    }
  };

  const activeSQL = isEditing ? editSQL : generatedSQL;

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
                  placeholder="e.g. Show ONTs from RM_ONT where APP_STATUS is READY..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generateFromNL(); }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={generateFromNL} disabled={generating || !prompt.trim()}>
                  {generating ? <><div className="spinner" /> Generating...</> : '◈ Generate SQL'}
                </button>
                {generatedSQL && (
                  <button className="btn btn-green" onClick={execute} disabled={executing}>
                    {executing ? <><div className="spinner" /> Executing...</> : '▶ Execute'}
                  </button>
                )}
                <ExportButton columns={result?.columns || []} data={result?.data || []} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Example Prompts</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {EXAMPLES.map((ex, i) => (
                <button key={i} className="btn btn-ghost"
                  style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: 12 }}
                  onClick={() => setPrompt(ex)}>
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Output */}
        <div className="section-gap">
          {error && <div className="alert alert-error">⚠ {error}</div>}

          {/* SQL Preview or Edit */}
          {isEditing ? (
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <span className="card-title">Edit Generated SQL</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => { setIsEditing(false); setEditSQL(generatedSQL); }}>
                    ✕ Cancel
                  </button>
                  <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => { setGeneratedSQL(editSQL); setIsEditing(false); }}>
                    ✓ Save
                  </button>
                </div>
              </div>
              <div className="card-body">
                <textarea
                  className="form-control"
                  style={{ minHeight: 180, fontSize: 13 }}
                  value={editSQL}
                  onChange={e => setEditSQL(e.target.value)}
                  spellCheck={false}
                />
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-2)' }}>
                  ✏ Editing manually — click Save then Execute
                </div>
              </div>
            </div>
          ) : (
            <QueryPreview
              sql={generatedSQL}
              onEdit={generatedSQL ? () => { setEditSQL(generatedSQL); setIsEditing(true); } : null}
            />
          )}

          {/* Results */}
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
