import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';

export default function TableSelector({ value, onChange, selectedDb }) {
  const [tables, setTables]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');
  const [open, setOpen]       = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef(null);
  const searchRef  = useRef(null);

  useEffect(() => {
    api.getTables(selectedDb)
      .then(d => setTables(d.tables || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedDb]);

  // Recalculate position every time the dropdown opens
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({
        top:   rect.bottom + window.scrollY + 2,
        left:  rect.left   + window.scrollX,
        width: rect.width,
      });
      // focus search input
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        !document.getElementById('table-selector-portal')?.contains(e.target)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = tables.filter(t =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  const select = (table) => {
    onChange(table);
    setOpen(false);
    setSearch('');
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  if (loading) return (
    <div className="form-group">
      <label className="form-label">Table</label>
      <div className="loader"><div className="spinner" /> Loading tables...</div>
    </div>
  );
  if (error) return (
    <div className="form-group">
      <label className="form-label">Table</label>
      <div className="alert alert-error">⚠ {error}</div>
    </div>
  );

  return (
    <div className="form-group">
      <label className="form-label">Table</label>

      {/* Trigger */}
      <div
        ref={triggerRef}
        className="form-control"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
          borderColor: open ? 'var(--amber)' : 'var(--border)',
        }}
      >
        <span style={{ color: value ? 'var(--text-1)' : 'var(--text-2)', fontSize: 13 }}>
          {value || '— select or type table —'}
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {value && (
            <span
              onClick={clear}
              style={{ fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', padding: '0 4px' }}
              title="Clear"
            >✕</span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Portal dropdown — fixed to viewport so it's never clipped */}
      {open && (
        <div
          id="table-selector-portal"
          style={{
            position: 'fixed',
            top:    dropPos.top,
            left:   dropPos.left,
            width:  dropPos.width,
            zIndex: 9999,
            background: 'var(--bg-2)',
            border: '1px solid var(--amber)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '60vh',        // always shows plenty of rows
          }}
        >
          {/* Search */}
          <div style={{ padding: '8px 8px 4px', flexShrink: 0 }}>
            <input
              ref={searchRef}
              className="form-control"
              placeholder="🔍 Type to search tables…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 12 }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', color: 'var(--text-2)', fontSize: 12 }}>
                No tables match "{search}"
              </div>
            ) : (
              filtered.map(t => (
                <div
                  key={t}
                  onClick={() => select(t)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'var(--mono)',
                    background:  t === value ? 'var(--amber-glow)' : 'transparent',
                    color:       t === value ? 'var(--amber)' : 'var(--text-1)',
                    borderLeft:  t === value ? '2px solid var(--amber)' : '2px solid transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (t !== value) e.currentTarget.style.background = 'var(--bg-1)'; }}
                  onMouseLeave={e => { if (t !== value) e.currentTarget.style.background = 'transparent'; }}
                >
                  {t}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '4px 12px 6px', fontSize: 10,
            color: 'var(--text-2)', borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {filtered.length} of {tables.length} tables
          </div>
        </div>
      )}
    </div>
  );
}