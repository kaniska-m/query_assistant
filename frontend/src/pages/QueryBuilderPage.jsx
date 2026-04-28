import { useEffect, useState } from 'react';
import { api } from '../api/api';
import TableSelector from '../components/TableSelector';
import ColumnSelector from '../components/ColumnSelector';
import FilterBuilder from '../components/FilterBuilder';
import QueryPreview from '../components/QueryPreview';
import ResultTable from '../components/ResultTable';

const DEFAULT_FILTERS = { logic: 'AND', conditions: [] };

function StepIndicator({ table, columns, generatedSQL }) {
  const steps = [
    { label: 'Table', done: !!table },
    { label: 'Columns', done: columns.length > 0 },
    { label: 'Filters', done: true },
    { label: 'Preview', done: !!generatedSQL },
  ];
  const activeIdx = steps.findIndex(s => !s.done);
  return (
    <div className="step-indicator">
      {steps.map((s, i) => (
        <div
          key={s.label}
          className={`step-item${s.done ? ' done' : i === activeIdx ? ' active' : ''}`}
        >
          <div className="step-num">{s.done ? '✓' : i + 1}</div>
          {s.label}
        </div>
      ))}
    </div>
  );
}

export default function QueryBuilderPage({ onAddHistory }) {
  const [table, setTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [allColumns, setAllColumns] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [orderBy, setOrderBy] = useState('');
  const [orderDir, setOrderDir] = useState('ASC');
  const [limit, setLimit] = useState('100');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [editSQL, setEditSQL] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch columns list for filter builder (needs col types)
  useEffect(() => {
    if (!table) { setAllColumns([]); setColumns([]); setFilters(DEFAULT_FILTERS); return; }
    api.getColumns(table)
      .then(d => setAllColumns(d.columns || []))
      .catch(() => {});
  }, [table]);

  const buildPayload = () => ({
    table,
    columns: columns.length ? columns : allColumns.map(c => c.name),
    filters,
    order_by: orderBy || undefined,
    order_dir: orderDir,
    limit: limit ? parseInt(limit) : undefined,
  });

  const generateQuery = async () => {
    if (!table) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await api.generateQuery(buildPayload());
      const sql = res.query || res.sql || '';
      setGeneratedSQL(sql);
      setEditSQL(sql);
      setIsEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const executeQuery = async () => {
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

  const reset = () => {
    setTable(''); setColumns([]); setAllColumns([]);
    setFilters(DEFAULT_FILTERS); setOrderBy(''); setLimit('100');
    setGeneratedSQL(''); setEditSQL(''); setResult(null); setError(null);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">⊞ Query Builder</div>
          <div className="page-subtitle">Build queries step by step — no SQL required</div>
        </div>
        <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={reset}>↺ Reset</button>
      </div>

      <StepIndicator table={table} columns={columns} generatedSQL={generatedSQL} />

      <div className="split-layout wide-left">
        {/* LEFT: Controls */}
        <div className="section-gap">
          <div className="card">
            <div className="card-header"><span className="card-title">1 · Table</span></div>
            <div className="card-body">
              <TableSelector value={table} onChange={setTable} />
            </div>
          </div>

          {table && (
            <div className="card">
              <div className="card-header"><span className="card-title">2 · Columns</span></div>
              <div className="card-body">
                <ColumnSelector table={table} selected={columns} onChange={setColumns} />
              </div>
            </div>
          )}

          {table && (
            <div className="card">
              <div className="card-header"><span className="card-title">3 · Filters</span></div>
              <div className="card-body">
                <FilterBuilder
                  table={table}
                  columns={allColumns}
                  filters={filters}
                  onChange={setFilters}
                />
              </div>
            </div>
          )}

          {table && (
            <div className="card">
              <div className="card-header"><span className="card-title">4 · Options</span></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px', gap: 10, alignItems: 'end' }}>
                  <div className="form-group">
                    <label className="form-label">Order By</label>
                    <select className="form-control" value={orderBy} onChange={e => setOrderBy(e.target.value)}>
                      <option value="">— none —</option>
                      {allColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Direction</label>
                    <select className="form-control" value={orderDir} onChange={e => setOrderDir(e.target.value)} disabled={!orderBy}>
                      <option>ASC</option>
                      <option>DESC</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Limit</label>
                    <input
                      className="form-control"
                      type="number"
                      min="1"
                      max="10000"
                      value={limit}
                      onChange={e => setLimit(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={generateQuery} disabled={!table || generating}>
              {generating ? <><div className="spinner" /> Generating...</> : '⚙ Generate Query'}
            </button>
            <button
              className="btn btn-primary"
              onClick={executeQuery}
              disabled={!generatedSQL || executing}
            >
              {executing ? <><div className="spinner" /> Executing...</> : '▶ Execute'}
            </button>
          </div>
        </div>

        {/* RIGHT: Preview + Results */}
        <div className="section-gap">
          {error && <div className="alert alert-error">⚠ {error}</div>}

          {isEditing ? (
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <span className="card-title">Edit SQL</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { setIsEditing(false); setEditSQL(generatedSQL); }}>✕ Cancel</button>
                  <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { setGeneratedSQL(editSQL); setIsEditing(false); }}>✓ Save</button>
                </div>
              </div>
              <div className="card-body">
                <textarea
                  className="form-control"
                  style={{ minHeight: 160, fontSize: 13 }}
                  value={editSQL}
                  onChange={e => setEditSQL(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
          ) : (
            <QueryPreview
              sql={generatedSQL}
              onEdit={generatedSQL ? () => { setEditSQL(generatedSQL); setIsEditing(true); } : null}
            />
          )}

          {result ? (
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <span className="card-title">Results</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="tag tag-green">{result.data?.length ?? 0} rows</span>
                  {result.execution_time && <span className="tag tag-amber">⏱ {result.execution_time}</span>}
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <ResultTable columns={result.columns} data={result.data} />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-icon">◌</div>
                  <p>Generate and execute a query to see results</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
