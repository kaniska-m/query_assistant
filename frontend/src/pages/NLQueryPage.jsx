import { useState } from 'react';
import { api } from '../api/api';
import { useQueryExecution } from '../hooks/useQueryExecution';
import PageHeader from '../components/ui/PageHeader';
import SqlEditor from '../components/ui/SqlEditor';
import ResultsCard from '../components/ui/ResultsCard';
import QueryPreview from '../components/QueryPreview';
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
  const [generating, setGenerating] = useState(false);
  const [nlError, setNlError] = useState(null);
  const { result, executing, error, execute } = useQueryExecution(onAddHistory);

  const generateFromNL = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGeneratedSQL('');
    setEditSQL('');
    setIsEditing(false);
    setNlError(null); 
    try {
      const res = await api.nlToSQL(prompt);
      const sql = res.query || res.sql || '';
      setGeneratedSQL(sql);
      setEditSQL(sql);
    } catch (e) {
      setNlError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExecute = () => execute(isEditing ? editSQL : generatedSQL);

  return (
    <div className="page-content">
      <PageHeader icon="◈" title="Natural Language Query" subtitle="Describe what you want — SQL is generated automatically">
        <span className="tag tag-amber" style={{ marginLeft: 'auto' }}>Beta</span>
      </PageHeader>

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
                  <button className="btn btn-green" onClick={handleExecute} disabled={executing}>
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
          {nlError && <div className="alert alert-error">⚠ {nlError}</div>}
          {error && <div className="alert alert-error">⚠ {error}</div>}
          {isEditing ? (
            <SqlEditor
              title="Edit Generated SQL"
              sql={editSQL}
              onChange={setEditSQL}
              onSave={() => { setGeneratedSQL(editSQL); setIsEditing(false); }}
              onCancel={() => { setIsEditing(false); setEditSQL(generatedSQL); }}
            />
          ) : (
            <QueryPreview
              sql={generatedSQL}
              onEdit={generatedSQL ? () => { setEditSQL(generatedSQL); setIsEditing(true); } : null}
            />
          )}

          <ResultsCard result={result} emptyIcon="◈" emptyMessage="Generated SQL and results will appear here" />
        </div>
      </div>
    </div>
  );
}
