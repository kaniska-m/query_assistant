import { useState } from 'react';
import { api } from '../api/api';
import QueryPreview from './QueryPreview';
import ResultTable from './ResultTable';

const SCHEMAS = {
  RM_ONT: {
    label: 'RM_ONT',
    desc: 'Current ONT device info & state',
    serialCol: 'SERIAL_NO',
    dateColOptions: [
      { label: 'Timestamp', col: 'TIME_STAMP' },
      { label: 'Commission Date', col: 'COMMISSION_DATE' },
      { label: 'State Change Time', col: 'STATE_CHANGE_TIME' },
      { label: 'NW Entry Time', col: 'NW_ENTRY_TIME' },
      { label: 'NMS Config Date', col: 'NMS_CONFIG_DATE' },
    ],
    statusCol: 'APP_STATUS',
    statusOptions: ['READY', 'SW-INIT-RESET', 'UPGRADING', 'UNKNOWN'],
    stateCol: 'STATE',
    stateOptions: ['0', '1', '2', '3', '4', '7'],
    phyStatusCol: 'PHY_STATUS',
    phyStatusOptions: ['ACTIVATED', 'ACTIVATE-PENDING', 'MISSING', 'DEACTIVATED'],
    extraFields: [
      { label: 'OLT IP', col: 'OLT_IP', type: 'text' },
      { label: 'ONT IP', col: 'ONT_IP', type: 'text' },
      { label: 'Location ID', col: 'LOCATION_ID', type: 'number' },
      { label: 'OLT PIC PON ID', col: 'OLT_PIC_PON_ID', type: 'number' },
    ],
  },
  RM_ONT_HISTORY: {
    label: 'RM_ONT_HISTORY',
    desc: 'ONT historical state changes & availability',
    serialCol: 'SERIAL_NO',
    dateColOptions: [
      { label: 'Timestamp', col: 'TIME_STAMP' },
      { label: 'Commission Date', col: 'COMMISSION_DATE' },
      { label: 'State Change Time', col: 'STATE_CHANGE_TIME' },
      { label: 'NW Entry Time', col: 'NW_ENTRY_TIME' },
      { label: 'NMS Config Date', col: 'NMS_CONFIG_DATE' },
    ],
    statusCol: 'APP_STATUS',
    statusOptions: ['READY', 'SW-INIT-RESET', 'UPGRADING', 'UNKNOWN'],
    stateCol: 'STATE',
    stateOptions: ['0', '1', '2', '3', '4', '7'],
    phyStatusCol: 'PHY_STATUS',
    phyStatusOptions: ['ACTIVATED', 'ACTIVATE-PENDING', 'MISSING', 'DEACTIVATED'],
    extraFields: [
      { label: 'OLT IP', col: 'OLT_IP', type: 'text' },
      { label: 'ONT IP', col: 'ONT_IP', type: 'text' },
      { label: 'Location ID', col: 'LOCATION_ID', type: 'number' },
      { label: 'CCU', col: 'CCU', type: 'number' },
    ],
  },
};

const QUICK_COLS = {
  RM_ONT: [
    'SERIAL_NO', 'NAME', 'ONT_ID', 'ONT_IP', 'OLT_IP',
    'APP_STATUS', 'PHY_STATUS', 'STATE', 'TIME_STAMP',
    'STATE_CHANGE_TIME', 'COMMISSION_DATE', 'LOCATION_ID',
    'OLT_PIC_PON_ID', 'REMARKS', 'VERSION',
  ],
  RM_ONT_HISTORY: [
    'SERIAL_NO', 'NAME', 'ONT_ID', 'ONT_IP', 'OLT_IP',
    'APP_STATUS', 'PHY_STATUS', 'STATE', 'TIME_STAMP',
    'STATE_CHANGE_TIME', 'COMMISSION_DATE', 'LOCATION_ID',
    'CCU', 'REMARKS', 'VERSION',
  ],
};

const ORDER_COLS = {
  RM_ONT: ['TIME_STAMP', 'SERIAL_NO', 'APP_STATUS', 'PHY_STATUS', 'STATE', 'STATE_CHANGE_TIME', 'COMMISSION_DATE', 'NW_ENTRY_TIME'],
  RM_ONT_HISTORY: ['TIME_STAMP', 'SERIAL_NO', 'APP_STATUS', 'PHY_STATUS', 'STATE', 'STATE_CHANGE_TIME', 'COMMISSION_DATE', 'NW_ENTRY_TIME'],
};

function buildSQL(table, form) {
  const schema = SCHEMAS[table];
  const conditions = [];
  const dateCol = form.dateCol || schema.dateColOptions[0].col;

  if (form.serialNo?.trim())
    conditions.push(`${schema.serialCol} = '${form.serialNo.trim()}'`);
  if (form.dateFrom)
    conditions.push(`${dateCol} >= TO_DATE('${form.dateFrom}', 'YYYY-MM-DD')`);
  if (form.dateTo)
    conditions.push(`${dateCol} <= TO_DATE('${form.dateTo}', 'YYYY-MM-DD')`);
  if (form.appStatus)
    conditions.push(`${schema.statusCol} = '${form.appStatus}'`);
  if (form.phyStatus)
    conditions.push(`${schema.phyStatusCol} = '${form.phyStatus}'`);
  if (form.state !== '')
    conditions.push(`${schema.stateCol} = ${form.state}`);

  schema.extraFields?.forEach(f => {
    const val = form.extra?.[f.col]?.toString().trim();
    if (val) {
      conditions.push(
        f.type === 'number' ? `${f.col} = ${val}` : `${f.col} = '${val}'`
      );
    }
  });

  const cols = form.selectedCols?.length ? form.selectedCols.join(', ') : '*';
  let sql = `SELECT ${cols}\nFROM ${table}`;

  if (conditions.length > 0) {
    sql += `\nWHERE ` + conditions.join('\n  AND ');
    sql += `\n  AND ROWNUM <= ${form.limit || 100}`;
  } else {
    sql += `\nWHERE ROWNUM <= ${form.limit || 100}`;
  }

  if (form.orderBy)
    sql += `\nORDER BY ${form.orderBy} ${form.orderDir || 'DESC'}`;

  return sql;
}

const defaultForm = (schema) => ({
  serialNo: '', dateFrom: '', dateTo: '',
  dateCol: schema.dateColOptions[0].col,
  appStatus: '', state: '', phyStatus: '',
  extra: {}, selectedCols: [],
  orderBy: 'TIME_STAMP', orderDir: 'DESC', limit: '100',
});

export default function SmartQueryBuilder({ onAddHistory }) {
  const [activeTable, setActiveTable] = useState('RM_ONT');
  const [forms, setForms] = useState({
    RM_ONT: defaultForm(SCHEMAS.RM_ONT),
    RM_ONT_HISTORY: defaultForm(SCHEMAS.RM_ONT_HISTORY),
  });
  const [sqls, setSqls] = useState({ RM_ONT: '', RM_ONT_HISTORY: '' });
  const [editSQL, setEditSQL] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [result, setResult] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState(null);

  const schema = SCHEMAS[activeTable];
  const form = forms[activeTable];
  const generatedSQL = sqls[activeTable];

  const updateForm = (patch) => {
    const updated = { ...forms[activeTable], ...patch };
    setForms(prev => ({ ...prev, [activeTable]: updated }));
    setSqls(prev => ({ ...prev, [activeTable]: buildSQL(activeTable, updated) }));
    setIsEditing(false);
    setResult(null);
    setError(null);
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
    setResult(null);
    setError(null);
    setIsEditing(false);
  };

  const resetForm = () => {
    const fresh = defaultForm(schema);
    setForms(prev => ({ ...prev, [activeTable]: fresh }));
    setSqls(prev => ({ ...prev, [activeTable]: '' }));
    setResult(null);
    setError(null);
    setIsEditing(false);
  };

  const execute = async () => {
    const sqlToRun = isEditing ? editSQL : generatedSQL;
    if (!sqlToRun) return;
    setExecuting(true);
    setError(null);
    try {
      const res = await api.executeSQL(sqlToRun);
      setResult(res);
      onAddHistory?.({ sql: sqlToRun, timestamp: new Date().toISOString(), execTime: res.execution_time });
    } catch (e) {
      setError(e.message);
    } finally {
      setExecuting(false);
    }
  };

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
                  <label className="form-label">App Status <span style={{ color: 'var(--text-2)' }}>({schema.statusCol} · VARCHAR2)</span></label>
                  <select className="form-control" value={form.appStatus}
                    onChange={e => updateForm({ appStatus: e.target.value })}>
                    <option value="">— any —</option>
                    {schema.statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Physical Status <span style={{ color: 'var(--text-2)' }}>({schema.phyStatusCol} · VARCHAR2)</span></label>
                  <select className="form-control" value={form.phyStatus}
                    onChange={e => updateForm({ phyStatus: e.target.value })}>
                    <option value="">— any —</option>
                    {schema.phyStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">State <span style={{ color: 'var(--text-2)' }}>({schema.stateCol} · NUMBER)</span></label>
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

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={execute} disabled={executing}>
              {executing ? <><div className="spinner" /> Executing...</> : '▶ Execute Query'}
            </button>
            <button className="btn btn-ghost" onClick={resetForm}>↺ Reset</button>
          </div>
        </div>

        {/* RIGHT: SQL Preview + Results */}
        <div className="section-gap">
          {error && <div className="alert alert-error">⚠ {error}</div>}

          {isEditing ? (
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <span className="card-title">Edit SQL</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => setIsEditing(false)}>✕ Cancel</button>
                  <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => { setSqls(p => ({ ...p, [activeTable]: editSQL })); setIsEditing(false); }}>✓ Save</button>
                </div>
              </div>
              <div className="card-body">
                <textarea className="form-control" style={{ minHeight: 180, fontSize: 13 }}
                  value={editSQL} onChange={e => setEditSQL(e.target.value)} spellCheck={false} />
              </div>
            </div>
          ) : (
            <QueryPreview
              sql={generatedSQL}
              onEdit={generatedSQL ? () => { setEditSQL(generatedSQL); setIsEditing(true); } : null}
            />
          )}

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

          {result ? (
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <span className="card-title">Results</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="tag tag-green">{result.data?.length ?? 0} rows</span>
                  {result.execution_time && <span className="tag tag-amber">⏱ {result.execution_time}</span>}
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <ResultTable columns={result.columns} data={result.data}
                  execTime={result.execution_time} rowCount={result.data?.length} />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-icon">◌</div>
                  <p>SQL is auto-generated as you fill the form</p>
                  <p style={{ marginTop: 6 }}>Click Execute when ready</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
