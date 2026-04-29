import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/api';

function DropdownPortal({ inputRef, children, open }) {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + window.scrollY + 2,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, [open, inputRef]);

  if (!open) return null;

  return createPortal(
    <div style={{
      position: 'absolute',
      top: coords.top,
      left: coords.left,
      width: coords.width,
      zIndex: 9999,
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      maxHeight: 240,
      overflowY: 'auto',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      {children}
    </div>,
    document.body
  );
}

export default function TableSelector({ value, onChange }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    api.getTables()
      .then(d => setTables(d.tables || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        !e.target.closest('[data-table-dropdown]')
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync when value is reset externally
  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  const filtered = tables.filter(t =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  const select = (table) => {
    onChange(table);
    setSearch(table);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange('');
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
    <div className="form-group" ref={containerRef}>
      <label className="form-label">
        Table
        {tables.length > 0 && (
          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-2)', fontWeight: 400 }}>
            {tables.length} available
          </span>
        )}
      </label>

      <input
        ref={inputRef}
        className="form-control"
        type="text"
        placeholder="Type to search tables..."
        value={search}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        spellCheck={false}
      />

      <DropdownPortal inputRef={inputRef} open={open}>
        <div data-table-dropdown="true">
          {filtered.length > 0 ? (
            filtered.map(t => (
              <div
                key={t}
                onMouseDown={() => select(t)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'var(--mono)',
                  color: t === value ? 'var(--amber)' : 'var(--text-1)',
                  background: t === value ? 'var(--amber-glow)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={e => {
                  if (t !== value) e.currentTarget.style.background = 'var(--bg-3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = t === value ? 'var(--amber-glow)' : 'transparent';
                }}
              >
                {t}
              </div>
            ))
          ) : (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-2)' }}>
              No tables match "{search}"
            </div>
          )}
        </div>
      </DropdownPortal>
    </div>
  );
}