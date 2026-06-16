export default function SqlEditor({ title = 'Edit SQL', sql, onChange, onSave, onCancel }) {
  return (
    <div className="card">
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <span className="card-title">{title}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={onCancel}
          >
            ✕ Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={onSave}
          >
            ✓ Save
          </button>
        </div>
      </div>
      <div className="card-body">
        <textarea
          className="form-control"
          style={{ minHeight: 180, fontSize: 13 }}
          value={sql}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
        />
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-2)' }}>
          ✏ Editing manually — click Save then Execute
        </div>
      </div>
    </div>
  );
}
