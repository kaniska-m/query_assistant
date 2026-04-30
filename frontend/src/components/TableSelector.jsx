import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function TableSelector({ value, onChange }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTables()
      .then(d => setTables(d.tables || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
      <select className="form-control" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">— select table —</option>
        {tables.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  );
}
