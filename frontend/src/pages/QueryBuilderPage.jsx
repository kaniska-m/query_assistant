import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useQueryExecution } from '../hooks/useQueryExecution';
import PageHeader from '../components/ui/PageHeader';
import SqlEditor from '../components/ui/SqlEditor';
import ResultsCard from '../components/ui/ResultsCard';
import TableSelector from '../components/TableSelector';
import ColumnSelector from '../components/ColumnSelector';
import FilterBuilder from '../components/FilterBuilder';
import QueryPreview from '../components/QueryPreview';
import SmartQueryBuilder from '../components/SmartQueryBuilder';
import ExportButton from '../components/ExportButton';

const DEFAULT_FILTERS = { logic: 'AND', conditions: [] };

function StepIndicator({ table, columns, generatedSQL }) {
  const steps = [
    { label: 'Table',   done: !!table },
    { label: 'Columns', done: columns.length > 0 },
    { label: 'Filters', done: true },
    { label: 'Preview', done: !!generatedSQL },
  ];
  const activeIdx = steps.findIndex(s => !s.done);
  return (
    <div className="step-indicator">
      {steps.map((s, i) => (
        <div key={s.label} className={`step-item${s.done ? ' done' : i === activeIdx ? ' active' : ''}`}>
          <div className="step-num">{s.done ? '✓' : i + 1}</div>
          {s.label}
        </div>
      ))}
    </div>
  );
}

const TAB_STYLES = (active) => ({
  padding: '9px 20px',
  background: active ? 'var(--amber-glow)' : 'var(--bg-2)',
  border: 'none',
  borderBottom: active ? '2px solid var(--amber)' : '2px solid transparent',
  color: active ? 'var(--amber)' : 'var(--text-2)',
  fontFamily: 'var(--mono)',
  fontSize: 12,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  transition: 'all 0.15s',
});

export default function QueryBuilderPage({ onAddHistory, selectedDb }) {
  const [mode, setMode] = useState('smart');

  const [table, setTable]           = useState('');
  const [columns, setColumns]       = useState([]);
  const [allColumns, setAllColumns] = useState([]);
  const [filters, setFilters]       = useState(DEFAULT_FILTERS);
  const [orderBy, setOrderBy]       = useState('');
  const [orderDir, setOrderDir]     = useState('ASC');
  const [limit, setLimit]           = useState('100');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [editSQL, setEditSQL]       = useState('');
  const [isEditing, setIsEditing]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const { result, executing, error, execute, reset: resetResult } = useQueryExecution(onAddHistory, selectedDb);

  useEffect(() => {
    if (!table) { setAllColumns([]); setColumns([]); setFilters(DEFAULT_FILTERS); return; }
    api.getColumns(table, selectedDb)
      .then(d => setAllColumns(d.columns || []))
      .catch(() => {});
  }, [table, selectedDb]);

  useEffect(() => {
    setTable(''); setColumns([]); setAllColumns([]);
    setFilters(DEFAULT_FILTERS); setGeneratedSQL(''); setEditSQL('');
    resetResult();
  }, [selectedDb]);

  const buildPayload = (overrideFilters) => ({
    table,
    columns: columns.length ? columns : ['*'],
    filters: overrideFilters !== undefined ? overrideFilters : filters,
    order_by: orderBy ? { column: orderBy, direction: orderDir } : undefined,
    limit: limit ? parseInt(limit) : 100,
    db_name: selectedDb,
  });

  const generateQuery = async (overrideFilters) => {
    if (!table) {
      setGenerateError('Please select a table first.');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    try {
      const payload = buildPayload(overrideFilters);
      console.log('[QueryBuilder] generateQuery payload:', payload);
      const res = await api.generateQuery(payload);
      console.log('[QueryBuilder] generateQuery response:', res);
      const sql = res.query || res.sql || '';
      setGeneratedSQL(sql);
      setEditSQL(sql);
      setIsEditing(false);
    } catch (e) {
      console.error('[QueryBuilder] generateQuery error:', e);
      setGenerateError(e.message || 'Generate failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    if (newFilters.dateRangeGroups) {
      generateQuery(newFilters);
    }
  };

  const handleExecute = () => execute(isEditing ? editSQL : generatedSQL);

  const reset = () => {
    setTable(''); setColumns([]); setAllColumns([]);
    setFilters(DEFAULT_FILTERS); setOrderBy(''); setLimit('100');
    setGeneratedSQL(''); setEditSQL(''); setGenerateError('');
    resetResult();
  };

  return (
    <div className="page-content">
      <PageHeader icon="⊞" title="Query Builder" subtitle="Build queries visually — no SQL required">
        {selectedDb && <span className="tag tag-green" style={{ marginLeft: 8 }}>● {selectedDb}</span>}
        {mode === 'generic' && (
          <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={reset}>↺ Reset</button>
        )}
      </PageHeader>

      {!selectedDb && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠ No database selected — go to <a href="/" style={{ color: 'var(--amber)' }}>Home</a> and choose a database first.
        </div>
      )}

      <div style={{
        display: 'flex', marginBottom: 20,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-2)',
        borderRadius: 'var(--radius) var(--radius) 0 0',
        overflow: 'hidden',
      }}>
        <button style={TAB_STYLES(mode === 'smart')} onClick={() => setMode('smart')}>
          ⚡ Smart Builder
          <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>RM_ONT · RM_ONT_HISTORY</span>
        </button>
        <button style={TAB_STYLES(mode === 'generic')} onClick={() => setMode('generic')}>
          ⊞ Generic Builder
          <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>All tables</span>
        </button>
      </div>

      {mode === 'smart' && <SmartQueryBuilder onAddHistory={onAddHistory} selectedDb={selectedDb} />}

      {mode === 'generic' && (
        <>
          <StepIndicator table={table} columns={columns} generatedSQL={generatedSQL} />

          <div className="split-layout wide-left">
            <div className="section-gap">

              <div className="card">
                <div className="card-header"><span className="card-title">1 · Table</span></div>
                <div className="card-body">
                  <TableSelector value={table} onChange={setTable} selectedDb={selectedDb} />
                </div>
              </div>

              {table && (
                <div className="card">
                  <div className="card-header"><span className="card-title">2 · Columns</span></div>
                  <div className="card-body">
                    <ColumnSelector table={table} selected={columns} onChange={setColumns} selectedDb={selectedDb} />
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
                      onChange={handleFiltersChange}
                      selectedDb={selectedDb}
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
                        <input className="form-control" type="number" min="1" max="10000" value={limit} onChange={e => setLimit(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {generateError && (
                <div className="alert alert-error" style={{ fontSize: 12 }}>
                  ⚠ {generateError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => generateQuery()}
                  disabled={!table || generating || !selectedDb}
                >
                  {generating ? <><div className="spinner" /> Generating...</> : '⚙ Generate Query'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleExecute}
                  disabled={!generatedSQL || executing || !selectedDb}
                >
                  {executing ? <><div className="spinner" /> Executing...</> : '▶ Execute'}
                </button>
                <ExportButton columns={result?.columns || []} data={result?.data || []} />
              </div>

            </div>

            <div className="section-gap">
              {error && <div className="alert alert-error">⚠ {error}</div>}
              {isEditing ? (
                <SqlEditor
                  sql={editSQL}
                  onChange={setEditSQL}
                  onSave={() => { setGeneratedSQL(editSQL); setIsEditing(false); }}
                  onCancel={() => { setIsEditing(false); setEditSQL(generatedSQL); }}
                />
              ) : (
                <QueryPreview
                  sql={generatedSQL}
                  onEdit={generatedSQL ? () => { setEditSQL(generatedSQL); setIsEditing(true); } : null}
                />
              )}
              <ResultsCard result={result} emptyMessage="Generate and execute a query to see results" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}