import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function ColumnSelector({ table, selected, onChange, selectedDb }) {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!table) { setColumns([]); return; }
    setLoading(true);
    api.getColumns(table, selectedDb)
      .then(d => setColumns(d.columns || []))
      .catch(() => setColumns([]))
      .finally(() => setLoading(false));
  }, [table]);

  const toggle = (colName) => {
    if (selected.includes(colName)) {
      onChange(selected.filter(c => c !== colName));
    } else {
      onChange([...selected, colName]);
    }
  };

  const toggleAll = () => {
    if (selected.length === columns.length) {
      onChange([]);
    } else {
      onChange(columns.map(c => c.name));
    }
  };

  if (!table) return null;
  if (loading) return (
    <div className="form-group">
      <label className="form-label">Columns</label>
      <div className="loader"><div className="spinner" /> Loading columns...</div>
    </div>
  );

  return (
    <div className="form-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label className="form-label">Columns</label>
        <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 10 }} onClick={toggleAll}>
          {selected.length === columns.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="checkbox-grid">
        {columns.map(col => {
          const checked = selected.includes(col.name);
          return (
            <div
              key={col.name}
              className={`checkbox-item${checked ? ' checked' : ''}`}
              onClick={() => toggle(col.name)}
            >
              <input type="checkbox" checked={checked} readOnly />
              <div className="checkbox-box" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {col.name}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-2)', flexShrink: 0 }}>
                {col.type?.split('(')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
