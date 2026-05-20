import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api/api';

const cards = [
  {
    to: '/executor',
    icon: '⌨',
    title: 'SQL Executor',
    desc: 'Write and run raw SQL queries directly against the database. Full control, instant results.',
    color: 'var(--blue)',
  },
  {
    to: '/builder',
    icon: '⊞',
    title: 'Query Builder',
    desc: 'Build queries visually — select tables, columns, and filters with no SQL required.',
    color: 'var(--amber)',
  },
  {
    to: '/nl',
    icon: '◈',
    title: 'Natural Language',
    desc: 'Describe what you want in plain English and get SQL generated automatically.',
    color: 'var(--purple)',
  },
];

export default function Home({ selectedDb, onSelectDb }) {
  const [databases, setDatabases]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dbError, setDbError]       = useState(null);

  useEffect(() => {
    api.getDatabases()
      .then(d => {
        const dbs = d.databases || [];
        setDatabases(dbs);
        // Auto-select first db if none chosen yet
        if (!selectedDb && dbs.length > 0) {
          onSelectDb(dbs[0].name);
        }
      })
      .catch(e => setDbError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const activeDb = databases.find(d => d.name === selectedDb);

  return (
    <div className="page-content">
      <div style={{ marginBottom: 32 }}>
        <div className="page-title">Query Assistant</div>
        <div className="page-subtitle" style={{ marginTop: 6 }}>
          Select a database below, then choose a mode to begin
        </div>
      </div>

      {/* ── Database Selector ── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <span className="card-title">🗄 Database Connection</span>
          {loading && <span style={{ fontSize: 11, color: 'var(--text-2)', marginLeft: 10 }}>Loading…</span>}
          {!loading && !dbError && (
            <span className="tag tag-green" style={{ marginLeft: 'auto' }}>
              ● {databases.length} available
            </span>
          )}
        </div>
        <div className="card-body">
          {dbError && (
            <div className="alert alert-error" style={{ marginBottom: 12 }}>
              ⚠ Could not load databases: {dbError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
              <label className="form-label">Choose Database</label>
              <select
                className="form-control"
                value={selectedDb || ''}
                onChange={e => onSelectDb(e.target.value)}
                disabled={loading || !!dbError}
                style={{ fontSize: 13 }}
              >
                <option value="" disabled>— select a database —</option>
                {databases.map(db => (
                  <option key={db.name} value={db.name}>
                    {db.label}  ({db.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Status badge for selected db */}
            {activeDb && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                padding: '8px 14px',
                background: 'var(--bg-0)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: 11,
                minWidth: 200,
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: 'var(--green)', fontSize: 9 }}>●</span>
                  <span style={{ color: 'var(--text-0)', fontWeight: 600 }}>{activeDb.label}</span>
                </div>
                {activeDb.description && (
                  <span style={{ color: 'var(--text-2)' }}>{activeDb.description}</span>
                )}
                <span style={{ color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: 10 }}>
                  id: {activeDb.name}
                </span>
              </div>
            )}
          </div>

          {/* DB cards (one per db, highlight active) */}
          {databases.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {databases.map(db => (
                <button
                  key={db.name}
                  onClick={() => onSelectDb(db.name)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius)',
                    border: db.name === selectedDb
                      ? '1px solid var(--green)'
                      : '1px solid var(--border)',
                    background: db.name === selectedDb ? 'rgba(0,200,120,0.08)' : 'var(--bg-2)',
                    color: db.name === selectedDb ? 'var(--green)' : 'var(--text-2)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {db.name === selectedDb ? '● ' : '○ '}{db.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Mode Cards ── */}
      <div className="home-grid">
        {cards.map(c => (
          <Link
            key={c.to}
            to={c.to}
            className="home-card"
            style={!selectedDb ? { opacity: 0.5, pointerEvents: 'none' } : {}}
            title={!selectedDb ? 'Select a database first' : ''}
          >
            <div className="home-card-arrow">→</div>
            <div className="home-card-icon" style={{ color: c.color }}>{c.icon}</div>
            <div className="home-card-title">{c.title}</div>
            <div className="home-card-desc">{c.desc}</div>
          </Link>
        ))}
      </div>

      <div className="divider" style={{ marginTop: 32 }} />

      {/* ── Info Row ── */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1', minWidth: 240 }}>
          <div className="card-header"><span className="card-title">Database Info</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-2)' }}>Selected</span>
                {selectedDb
                  ? <span className="tag tag-green">{selectedDb}</span>
                  : <span style={{ color: 'var(--text-2)', fontStyle: 'italic' }}>none</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-2)' }}>Engine</span>
                <span style={{ color: 'var(--text-1)' }}>Oracle DB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-2)' }}>Backend</span>
                <span style={{ color: 'var(--text-1)' }}>FastAPI</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-2)' }}>Available DBs</span>
                <span style={{ color: 'var(--text-1)' }}>{databases.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: '2', minWidth: 280 }}>
          <div className="card-header"><span className="card-title">Quick Tips</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
              <div>→ Select a <span style={{ color: 'var(--green)' }}>database</span> above before querying</div>
              <div>→ Use <span style={{ color: 'var(--amber)' }}>Query Builder</span> to explore tables without writing SQL</div>
              <div>→ Add filters with <span style={{ color: 'var(--amber)' }}>AND/OR logic</span> to narrow results</div>
              <div>→ Generated queries are editable before execution</div>
              <div>→ All executed queries are saved in <Link to="/history" style={{ color: 'var(--blue)' }}>History</Link></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
