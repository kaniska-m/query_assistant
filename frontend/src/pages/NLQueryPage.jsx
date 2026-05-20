import { useState } from 'react';
import { api } from '../api/api';
import { useQueryExecution } from '../hooks/useQueryExecution';
import PageHeader from '../components/ui/PageHeader';
import SqlEditor from '../components/ui/SqlEditor';
import ResultsCard from '../components/ui/ResultsCard';
import QueryPreview from '../components/QueryPreview';
import ExportButton from '../components/ExportButton';

const EXAMPLE_CATEGORIES = [
  {
    label: '📋 RM_ONT',
    color: 'var(--blue)',
    examples: [
      'Show ONTs where APP_STATUS is READY',
      'Count RM_ONT records grouped by APP_STATUS',
      'List ONTs where PHY_STATUS is ACTIVATED ordered by TIME_STAMP DESC',
      'Show ONTs with STATE 0 (DOWN)',
    ],
  },
  {
    label: '📜 RM_ONT_HISTORY',
    color: 'var(--purple)',
    examples: [
      'Show RM_ONT_HISTORY for serial number CDTB-88:0:0:13 in 2019',
      'Count ONT history records grouped by PHY_STATUS',
      'Show history records from last 30 days ordered by TIME_STAMP DESC',
    ],
  },
  {
    label: '📡 Availability',
    color: 'var(--green)',
    examples: [
      'Show availability for ONT serial CDTB-88:0:0:13 from January to March 2019',
      'List downtime records from last month',
      'Show uptime details for all ONTs ordered by DOWN_TIME DESC',
    ],
  },
  {
    label: '🔌 OLT',
    color: 'var(--amber)',
    examples: [
      'List current OLT with state 2',
      'Show OLT history records from last 7 days',
      'Count OLTs grouped by STATE',
      'Show RM_OLT where IP_ADDRESS starts with 10.',
    ],
  },
];

const JOIN_CAPABILITIES = [
  { icon: '📋', label: 'RM_ONT',              keywords: 'ont, serial, status, state, commissioned' },
  { icon: '📜', label: 'RM_ONT_HISTORY',      keywords: 'history, historical, past, changes' },
  { icon: '📡', label: 'RM_ONT_AVAILABILITY', keywords: 'availability, uptime, downtime, outage, sla' },
  { icon: '🔌', label: 'RM_OLT',              keywords: 'olt, current olt, olt ip' },
  { icon: '🕓', label: 'RM_OLT_HISTORY',      keywords: 'olt history, olt past, olt changes' },
];

const DETECTED_TABLES = [
  'RM_ONT', 'RM_ONT_HISTORY', 'RM_OLT_HISTORY', 'RM_OLT', 'RM_ONT_AVAILABILITY',
];

export default function NLQueryPage({ onAddHistory, selectedDb }) {
  const [prompt, setPrompt]         = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [editSQL, setEditSQL]       = useState('');
  const [isEditing, setIsEditing]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [nlError, setNlError]       = useState(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [recentPrompts, setRecentPrompts]   = useState([]);
  const { result, executing, error, execute, reset } = useQueryExecution(onAddHistory, selectedDb);

  const generateFromNL = async (text = prompt) => {
    if (!text.trim()) return;
    setPrompt(text);
    setGenerating(true);
    setGeneratedSQL('');
    setEditSQL('');
    setIsEditing(false);
    setNlError(null);
    reset();
    try {
      const res = await api.nlToSQL(text, selectedDb);
      const sql = res.query || res.sql || '';
      setGeneratedSQL(sql);
      setEditSQL(sql);
      setRecentPrompts(prev => [text, ...prev.filter(p => p !== text)].slice(0, 5));
    } catch (e) {
      setNlError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExecute = () => execute(isEditing ? editSQL : generatedSQL);

  const clearAll = () => {
    setPrompt(''); setGeneratedSQL(''); setEditSQL('');
    setIsEditing(false); setNlError(null); reset();
  };

  const detectedTables = generatedSQL
    ? DETECTED_TABLES.filter(t => {
        const regex = new RegExp(`(?<![A-Z0-9_])${t}(?![A-Z0-9_])`, 'i');
        return regex.test(generatedSQL);
      })
    : [];

  return (
    <div className="page-content">
      <PageHeader
        icon="◈"
        title="Natural Language Query"
        subtitle="Ask anything — single table or multi-table joins, all from plain English"
      >
        <span className="tag tag-amber" style={{ marginLeft: 'auto' }}>AI Powered</span>
      </PageHeader>

      {!selectedDb && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠ No database selected — go to <a href="/" style={{ color: 'var(--amber)' }}>Home</a> and choose a database first.
        </div>
      )}

      <div className="split-layout">

        {/* ── LEFT ── */}
        <div className="section-gap">
          <div className="card">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <span className="card-title">Your Question</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {selectedDb && <span className="tag tag-green">● {selectedDb}</span>}
                {prompt && (
                  <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={clearAll}>
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              <textarea
                className="form-control"
                style={{ minHeight: 110, fontSize: 13, lineHeight: 1.7 }}
                placeholder={
                  'Ask anything about your ONT data...\n' +
                  'e.g. "Show availability for serial CDTB-88:0:0:13 last month"\n' +
                  'e.g. "Count ONTs grouped by vendor name"'
                }
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generateFromNL(); }}
                disabled={!selectedDb}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => generateFromNL()}
                  disabled={generating || !prompt.trim() || !selectedDb}
                >
                  {generating ? <><div className="spinner" /> Generating...</> : '◈ Generate SQL'}
                </button>
                {generatedSQL && (
                  <button className="btn btn-green" onClick={handleExecute} disabled={executing || !selectedDb}>
                    {executing ? <><div className="spinner" /> Executing...</> : '▶ Execute'}
                  </button>
                )}
                <ExportButton columns={result?.columns || []} data={result?.data || []} />
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-2)' }}>
                  Ctrl+Enter to generate
                </span>
              </div>
            </div>
          </div>

          {recentPrompts.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">🕐 Recent</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recentPrompts.map((q, i) => (
                  <button
                    key={i} className="btn btn-ghost"
                    style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: 11, padding: '6px 10px' }}
                    onClick={() => setPrompt(q)}
                  >
                    ↺ {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header"><span className="card-title">🔗 Auto-Join Capabilities</span></div>
            <div className="card-body">
              <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.6 }}>
                Mention these keywords and the right tables are joined automatically:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {JOIN_CAPABILITIES.map((jc, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '7px 10px', background: 'var(--bg-0)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{jc.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-0)', fontWeight: 600 }}>{jc.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2 }}>{jc.keywords}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">💡 Example Queries</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', padding: '0 8px' }}>
                {EXAMPLE_CATEGORIES.map((cat, i) => (
                  <button key={i} onClick={() => setActiveCategory(i)} style={{
                    padding: '8px 10px', background: 'transparent', border: 'none',
                    borderBottom: activeCategory === i ? `2px solid ${cat.color}` : '2px solid transparent',
                    color: activeCategory === i ? cat.color : 'var(--text-2)',
                    fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
                    whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}>
                    {cat.label}
                  </button>
                ))}
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {EXAMPLE_CATEGORIES[activeCategory].examples.map((ex, i) => (
                  <button key={i} className="btn btn-ghost" style={{
                    textAlign: 'left', justifyContent: 'flex-start',
                    fontSize: 11, padding: '8px 10px',
                    borderLeft: `2px solid ${EXAMPLE_CATEGORIES[activeCategory].color}`,
                    borderRadius: '0 4px 4px 0',
                  }} onClick={() => setPrompt(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="section-gap">
          {nlError && <div className="alert alert-error">⚠ {nlError}</div>}
          {error && <div className="alert alert-error">⚠ {error}</div>}

          {generating && (
            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 16px' }}>
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-0)' }}>Analyzing your question...</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>Detecting tables, joins, and filters</div>
                </div>
              </div>
            </div>
          )}

          {!generating && (
            isEditing ? (
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
            )
          )}

          {detectedTables.length > 1 && !generating && (
            <div className="card">
              <div className="card-header"><span className="card-title">🔗 Tables Joined in Query</span></div>
              <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {detectedTables.map((t, i) => (
                  <span key={i} className={i === 0 ? 'tag tag-amber' : 'tag tag-blue'}>
                    {i === 0 ? '⚓' : '⟶'} {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <ResultsCard
            result={result}
            emptyIcon="◈"
            emptyMessage="Results will appear here after execution"
          />
        </div>
      </div>
    </div>
  );
}
