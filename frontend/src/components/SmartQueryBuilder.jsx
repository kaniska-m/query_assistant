import { useState } from 'react';
import { useQueryExecution } from '../hooks/useQueryExecution';
import { SCHEMAS, QUICK_COLS, ORDER_COLS, buildSQL, defaultForm } from '../constants/smartQuerySchema';
import QueryPreview from './QueryPreview';
import SqlEditor from './ui/SqlEditor';
import ResultsCard from './ui/ResultsCard';
import ExportButton from './ExportButton';

export default function SmartQueryBuilder({ onAddHistory }) {
  const [activeTable, setActiveTable] = useState('RM_ONT');
  const [forms, setForms] = useState({
    RM_ONT: defaultForm(SCHEMAS.RM_ONT),
    RM_ONT_HISTORY: defaultForm(SCHEMAS.RM_ONT_HISTORY),
  });
  const [sqls, setSqls] = useState({ RM_ONT: '', RM_ONT_HISTORY: '' });
  const [editSQL, setEditSQL] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { result, executing, error, execute, reset: resetResult } = useQueryExecution(onAddHistory);

  const schema = SCHEMAS[activeTable];
  const form = forms[activeTable];
  const generatedSQL = sqls[activeTable];

  const updateForm = (patch) => {
    const updated = { ...forms[activeTable], ...patch };
    setForms(prev => ({ ...prev, [activeTable]: updated }));
    setSqls(prev => ({ ...prev, [activeTable]: buildSQL(activeTable, updated) }));
    setIsEditing(false);
    resetResult();
  };

  const updateExtra = (col, val) => updateForm({ extra: { ...form.extra, [col]: val } });

  const toggleCol = (col) => {
    const cols = form.selectedCols.includes(col)
      ? form.selectedCols.filter(c => c !== col)
      : [...form.selectedCols, col];
    updateForm({ selectedCols: cols });
  };

  const switchTable = (table) => {
    setActiveTable(table);
    setIsEditing(false);
    resetResult();
  };

  const resetForm = () => {
    const fresh = defaultForm(schema);
    setForms(prev => ({ ...prev, [activeTable]: fresh }));
    setSqls(prev => ({ ...prev, [activeTable]: '' }));
    setIsEditing(false);
    resetResult();
  };

  const handleExecute = () => execute(isEditing ? editSQL : generatedSQL);

  const hasFilters = form.serialNo || form.dateFrom || form.dateTo ||
    form.appStatus || form.phyStatus || form.state ||
    schema.extraFields?.some(f => form.extra?.[f.col]);

  return (
    <div>
      {/* Table Tabs */}
      <div style={{
        display: 'flex', marginBottom: 20,
        border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden',
      }}>
        {Object.entries(SCHEMAS).map(([key, s]) => (
          <button key={key} onClick={() => switchTable(key)} style={{
            flex: 1, padding: '10px 16px',
            background: activeTable === key ? 'var(--amber-glow)' : 'var(--bg-2)',
            border: 'none',
            borderRight: key === 'RM_ONT' ? '1px solid var(--border)' : 'none',
            color: activeTable === key ? 'var(--amber)' : 'var(--text-2)',
            fontFamily: 'var(--mono)', fontSize: 12,
            fontWeight: activeTable === key ? 600 : 400,
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
          }}>
            <span>{s.label}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{s.desc}</span>
          </button>
        ))}
      </div>

      <div className="split-layout wide-left">
        {/* LEFT: Form */}
        <div className="section-gap">

          {/* Date Range */}
          <div className="card">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <span className="card-title">📅 Date Range</span>
              <select
                className="form-control"
                style={{ width: 'auto', fontSize: 11, padding: '2px 8px' }}
                value={form.dateCol}
                onChange={e => updateForm({ dateCol: e.target.value })}
              >
                {schema.dateColOptions.map(d => (
                  <option key={d.col} value={d.col}>{d.label} ({d.col})</option>
                ))}
              </select>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">From</label>
                  <input className="form-control" type="date" value={form.dateFrom}
                    onChange={e => updateForm({ dateFrom: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">To</label>
                  <input className="form-control" type="date" value={form.dateTo}
                    onChange={e => updateForm({ dateTo: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          {/* Serial Number */}
          <div className="card">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <span className="card-title">🔍 Serial Number</span>
              <span style={{ fontSize: 10, color: 'var(--text-2)' }}>→ {schema.serialCol}</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Serial No (exact match)</label>
                <input className="form-control" type="text"
                  placeholder="e.g. CDTB-88:0:0:13"
                  value={form.serialNo}
                  onChange={e => updateForm({ serialNo: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Status & State */}
          <div className="card">
            <div className="card-header"><span className="card-title">⚡ Status & State</span></div>
            <div className="card-body">
              <div className="section-gap">
                <div className="form-group">
                  <label className="form-label">
                    App Status <span style={{ color: 'var(--text-2)' }}>({schema.statusCol})</span>
                  </label>
                  <select className="form-control" value={form.appStatus}
                    onChange={e => updateForm({ appStatus: e.target.value })}>
                    <option value="">— any —</option>
                    {schema.statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Physical Status <span style={{ color: 'var(--text-2)' }}>({schema.phyStatusCol})</span>
                  </label>
                  <select className="form-control" value={form.phyStatus}
                    onChange={e => updateForm({ phyStatus: e.target.value })}>
                    <option value="">— any —</option>
                    {schema.phyStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    State <span style={{ color: 'var(--text-2)' }}>({schema.stateCol} · NUMBER)</span>
                  </label>
                  <select className="form-control" value={form.state}
                    onChange={e => updateForm({ state: e.target.value })}>
                    <option value="">— any —</option>
                    {schema.stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Extra Fields */}
          <div className="card">
            <div className="card-header"><span className="card-title">＋ Additional Filters</span></div>
            <div className="card-body">
              <div className="section-gap">
                {schema.extraFields.map(f => (
                  <div className="form-group" key={f.col}>
                    <label className="form-label">
                      {f.label} <span style={{ color: 'var(--text-2)' }}>({f.col} · {f.type === 'number' ? 'NUMBER' : 'VARCHAR2'})</span>
                    </label>
                    <input className="form-control" type={f.type}
                      placeholder={`Filter by ${f.label}`}
                      value={form.extra?.[f.col] || ''}
                      onChange={e => updateExtra(f.col, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Output Options */}
          <div className="card">
            <div className="card-header"><span className="card-title">⚙ Output Options</span></div>
            <div className="card-body">
              <div className="section-gap">
                <div className="form-group">
                  <label className="form-label">Columns <span style={{ color: 'var(--text-2)' }}>(blank = SELECT *)</span></label>
                  <div className="checkbox-grid">
                    {QUICK_COLS[activeTable].map(col => {
                      const checked = form.selectedCols.includes(col);
                      return (
                        <div key={col} className={`checkbox-item${checked ? ' checked' : ''}`}
                          onClick={() => toggleCol(col)}>
                          <div className="checkbox-box" />
                          <span style={{ fontSize: 11 }}>{col}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px', gap: 10, alignItems: 'end' }}>
                  <div className="form-group">
                    <label className="form-label">Order By</label>
                    <select className="form-control" value={form.orderBy}
                      onChange={e => updateForm({ orderBy: e.target.value })}>
                      <option value="">— none —</option>
                      {ORDER_COLS[activeTable].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dir</label>
                    <select className="form-control" value={form.orderDir}
                      onChange={e => updateForm({ orderDir: e.target.value })}>
                      <option>ASC</option><option>DESC</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Limit</label>
                    <input className="form-control" type="number" min="1" max="10000"
                      value={form.limit}
                      onChange={e => updateForm({ limit: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleExecute} disabled={executing}>
              {executing ? <><div className="spinner" /> Executing...</> : '▶ Execute Query'}
            </button>
            <button className="btn btn-ghost" onClick={resetForm}>↺ Reset</button>
            <ExportButton columns={result?.columns || []} data={result?.data || []} />
          </div>
        </div>

        {/* RIGHT: SQL Preview + Results */}
        <div className="section-gap">
          {error && <div className="alert alert-error">⚠ {error}</div>}

          {isEditing ? (
            <SqlEditor
              sql={editSQL}
              onChange={setEditSQL}
              onSave={() => { setSqls(p => ({ ...p, [activeTable]: editSQL })); setIsEditing(false); }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <QueryPreview
              sql={generatedSQL}
              onEdit={generatedSQL ? () => { setEditSQL(generatedSQL); setIsEditing(true); } : null}
            />
          )}

          {/* Active Filter Tags */}
          {hasFilters && (
            <div className="card">
              <div className="card-header"><span className="card-title">Active Filters</span></div>
              <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {form.serialNo && <span className="tag tag-blue">SERIAL_NO = '{form.serialNo}'</span>}
                {form.dateFrom && <span className="tag tag-amber">{form.dateCol} &gt;= {form.dateFrom}</span>}
                {form.dateTo && <span className="tag tag-amber">{form.dateCol} &lt;= {form.dateTo}</span>}
                {form.appStatus && <span className="tag tag-green">APP_STATUS = '{form.appStatus}'</span>}
                {form.phyStatus && <span className="tag tag-green">PHY_STATUS = '{form.phyStatus}'</span>}
                {form.state && <span className="tag tag-blue">STATE = {form.state}</span>}
                {schema.extraFields?.map(f => form.extra?.[f.col] && (
                  <span key={f.col} className="tag tag-blue">{f.col} = '{form.extra[f.col]}'</span>
                ))}
              </div>
            </div>
          )}

          <ResultsCard result={result} emptyMessage="Fill the form and click Execute to see results" />
        </div>
      </div>
    </div>
  );
}
