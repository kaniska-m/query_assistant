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
    label: '📋 Single Table',
    color: 'var(--blue)',
    examples: [
      'Show 10 ONTs from RM_ONT where APP_STATUS is READY',
      'Count RM_ONT records grouped by APP_STATUS',
      'Show RM_ONT_HISTORY for serial number CDTB-88:0:0:13 in 2019',
      'List ONTs where PHY_STATUS is ACTIVATED ordered by TIME_STAMP DESC',
    ],
  },
  {
    label: '📡 Availability',
    color: 'var(--green)',
    examples: [
      'Show availability for ONT serial CDTB-88:0:0:13 from January to March 2019',
      'List ONTs with their downtime records from last month',
      'Show uptime details for all ONTs ordered by availability',
    ],
  },
  {
    label: '🚨 Alarms',
    color: 'var(--red)',
    examples: [
      'Show all CRITICAL alarms for ONTs in RM_ONT',
      'Count alarms grouped by severity for last 30 days',
      'Find active faults for ONT named Delhi153PI',
    ],
  },
  {
    label: '📍 Location',
    color: 'var(--amber)',
    examples: [
      'Show ONTs with their district and location details',
      'Count ONTs per district grouped by APP_STATUS',
      'List all ONTs with location name and area',
    ],
  },
  {
    label: '🔗 Network',
    color: 'var(--purple)',
    examples: [
      'Show ONT CDTB-88:0:0:13 with its OLT and PON details',
      'List ONTs with their UNI port state and type',
      'Show optical RX and TX power for ONT named Delhi153PI',
      'Count ONTs grouped by vendor name',
    ],
  },
];

const JOIN_CAPABILITIES = [
  { icon: '📡', label: 'Availability',  keywords: 'availability, uptime, downtime, outage, sla' },
  { icon: '🚨', label: 'Alarms',        keywords: 'alarm, fault, severity, critical, major, alert' },
  { icon: '📍', label: 'Location',      keywords: 'location, district, region, area, city' },
  { icon: '🔌', label: 'OLT / PON',     keywords: 'olt, pon, pic, topology, network path' },
  { icon: '🔧', label: 'UNI Ports',     keywords: 'uni, port, service port, card' },
  { icon: '💡', label: 'Optical Power', keywords: 'optical, rx, tx, signal, power, dBm' },
  { icon: '🏭', label: 'Vendor',        keywords: 'vendor, manufacturer, brand' },
];

const DETECTED_TABLES = [
  'RM_ONT_HISTORY',
  'RM_ONT',
  'RM_ALARM',
  'RM_ONT_AVAILABILITY',
  'APP_RM_LOCATION',
  'RM_OLT_PICPON_MAP',
  'RM_ONT_UNI_PORT',
  'RM_ONT_OPTICAL_POWER',
  'RM_VENDOR',
  'RM_RESOURCE_STATE',
  'RM_ONT_TYPE',
];

export default function NLQueryPage({ onAddHistory }) {
  const [prompt, setPrompt] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [editSQL, setEditSQL] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [nlError, setNlError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [recentPrompts, setRecentPrompts] = useState([]);
  const { result, executing, error, execute, reset } = useQueryExecution(onAddHistory);

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
      const res = await api.nlToSQL(text);
      const sql = res.query || res.sql || '';
      setGeneratedSQL(sql);
      setEditSQL(sql);
      setRecentPrompts(prev =>
        [text, ...prev.filter(p => p !== text)].slice(0, 5)
      );
    } catch (e) {
      setNlError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExecute = () => execute(isEditing ? editSQL : generatedSQL);

  const clearAll = () => {
    setPrompt('');
    setGeneratedSQL('');
    setEditSQL('');
    setIsEditing(false);
    setNlError(null);
    reset();
  };

  const detectedTables = generatedSQL
    ? DETECTED_TABLES.filter(t => generatedSQL.toUpperCase().includes(t))
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

      <div className="split-layout">

        {/* ── LEFT ── */}
        <div className="section-gap">

          {/* Prompt Input */}
          <div className="card">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <span className="card-title">Your Question</span>
              {prompt && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={clearAll}
                >
                  ✕ Clear
                </button>
              )}
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
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generateFromNL();
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => generateFromNL()}
                  disabled={generating || !prompt.trim()}
                >
                  {generating
                    ? <><div className="spinner" /> Generating...</>
                    : '◈ Generate SQL'}
                </button>
                {generatedSQL && (
                  <button
                    className="btn btn-green"
                    onClick={handleExecute}
                    disabled={executing}
                  >
                    {executing
                      ? <><div className="spinner" /> Executing...</>
                      : '▶ Execute'}
                  </button>
                )}
                <ExportButton
                  columns={result?.columns || []}
                  data={result?.data || []}
                />
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-2)' }}>
                  Ctrl+Enter to generate
                </span>
              </div>
            </div>
          </div>

          {/* Recent Prompts */}
          {recentPrompts.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">🕐 Recent</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recentPrompts.map((q, i) => (
                  <button
                    key={i}
                    className="btn btn-ghost"
                    style={{
                      textAlign: 'left', justifyContent: 'flex-start',
                      fontSize: 11, padding: '6px 10px',
                    }}
                    onClick={() => setPrompt(q)}
                  >
                    ↺ {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-Join Capabilities */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🔗 Auto-Join Capabilities</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.6 }}>
                Mention these keywords and the right tables are joined automatically:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {JOIN_CAPABILITIES.map((jc, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '7px 10px',
                    background: 'var(--bg-0)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{jc.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-0)', fontWeight: 600 }}>
                        {jc.label}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2 }}>
                        {jc.keywords}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Categorized Examples */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">💡 Example Queries</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {/* Category Tabs */}
              <div style={{
                display: 'flex', overflowX: 'auto',
                borderBottom: '1px solid var(--border)',
                padding: '0 8px',
              }}>
                {EXAMPLE_CATEGORIES.map((cat, i) => (
                  <button key={i} onClick={() => setActiveCategory(i)} style={{
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeCategory === i
                      ? `2px solid ${cat.color}`
                      : '2px solid transparent',
                    color: activeCategory === i ? cat.color : 'var(--text-2)',
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}>
                    {cat.label}
                  </button>
                ))}
              </div>
              {/* Examples List */}
              <div style={{
                padding: '10px 12px',
                display: 'flex', flexDirection: 'column', gap: 5,
              }}>
                {EXAMPLE_CATEGORIES[activeCategory].examples.map((ex, i) => (
                  <button
                    key={i}
                    className="btn btn-ghost"
                    style={{
                      textAlign: 'left', justifyContent: 'flex-start',
                      fontSize: 11, padding: '8px 10px',
                      borderLeft: `2px solid ${EXAMPLE_CATEGORIES[activeCategory].color}`,
                      borderRadius: '0 4px 4px 0',
                    }}
                    onClick={() => setPrompt(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT ── */}
        <div className="section-gap">

          {/* Errors */}
          {nlError && <div className="alert alert-error">⚠ {nlError}</div>}
          {error && <div className="alert alert-error">⚠ {error}</div>}

          {/* Generating state */}
          {generating && (
            <div className="card">
              <div className="card-body" style={{
                display: 'flex', alignItems: 'center',
                gap: 14, padding: '20px 16px',
              }}>
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-0)' }}>
                    Analyzing your question...
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>
                    Detecting tables, joins, and filters
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SQL Preview or Editor */}
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
                onEdit={generatedSQL
                  ? () => { setEditSQL(generatedSQL); setIsEditing(true); }
                  : null}
              />
            )
          )}

          {/* Tables joined badge */}
          {detectedTables.length > 1 && !generating && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">🔗 Tables Joined in Query</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {detectedTables.map((t, i) => (
                  <span key={i} className={i === 0 ? 'tag tag-amber' : 'tag tag-blue'}>
                    {i === 0 ? '⚓' : '⟶'} {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
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