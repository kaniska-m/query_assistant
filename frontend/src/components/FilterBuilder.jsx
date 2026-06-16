import { useEffect, useState } from 'react';
import { api } from '../api/api';
import ExcelImportFilter from './ExcelImportFilter';

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'BETWEEN', 'IS NULL'];

function guessType(colName = '', colType = '') {
  const t = (colType || colName).toUpperCase();
  if (t.includes('DATE') || t.includes('TIME')) return 'date';
  if (t.includes('NUMBER') || t.includes('INT') || t.includes('FLOAT') || t.includes('DECIMAL') || t.includes('NUMERIC')) return 'number';
  return 'text';
}

function FilterRow({ row, columns, table, onChange, onRemove, selectedDb }) {
  const [colValues, setColValues] = useState([]);
  const [loadingVals, setLoadingVals] = useState(false);

  const colMeta = columns.find(c => c.name === row.column) || {};
  const colType = guessType(row.column, colMeta.type);

  useEffect(() => {
    if (!row.column || !table || colType !== 'text') { setColValues([]); return; }
    if (row.operator === 'IS NULL') return;
    setLoadingVals(true);
    api.getColumnValues(table, row.column, selectedDb)
      .then(d => setColValues(d.values || []))
      .catch(() => setColValues([]))
      .finally(() => setLoadingVals(false));
  }, [row.column, table, colType]);

  const update = (field, val) => onChange({ ...row, [field]: val });

  const renderValueInput = () => {
    if (row.operator === 'IS NULL') return null;
    if (row.operator === 'BETWEEN') {
      return (
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            className="form-control"
            type={colType === 'date' ? 'date' : colType === 'number' ? 'number' : 'text'}
            placeholder="from"
            value={row.value1 || ''}
            onChange={e => onChange({ ...row, value1: e.target.value })}
          />
          <input
            className="form-control"
            type={colType === 'date' ? 'date' : colType === 'number' ? 'number' : 'text'}
            placeholder="to"
            value={row.value2 || ''}
            onChange={e => onChange({ ...row, value2: e.target.value })}
          />
        </div>
      );
    }
    if (colType === 'text' && colValues.length > 0 && row.operator !== 'LIKE') {
      return (
        <select className="form-control" value={row.value || ''} onChange={e => update('value', e.target.value)} disabled={loadingVals}>
          <option value="">— value —</option>
          {colValues.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      );
    }
    return (
      <input
        className="form-control"
        type={colType === 'date' ? 'date' : colType === 'number' ? 'number' : 'text'}
        placeholder={row.operator === 'IN' ? 'val1,val2,...' : 'value'}
        value={row.value || ''}
        onChange={e => update('value', e.target.value)}
      />
    );
  };

  return (
    <div className="filter-row">
      <select className="form-control" value={row.column || ''} onChange={e => update('column', e.target.value)}>
        <option value="">— column —</option>
        {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
      </select>

      <select className="form-control" value={row.operator || '='} onChange={e => update('operator', e.target.value)}>
        {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
      </select>

      <div>{renderValueInput()}</div>

      <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={onRemove} title="Remove filter">✕</button>
    </div>
  );
}

export default function FilterBuilder({ table, columns, filters, onChange, selectedDb }) {
  const [logic, setLogic] = useState('AND');

  const addFilter = () => {
    onChange({
      logic,
      conditions: [
        ...filters.conditions,
        { column: '', operator: '=', value: '' }
      ]
    });
  };

  const removeFilter = (i) => {
    const conditions = filters.conditions.filter((_, idx) => idx !== i);
    onChange({ ...filters, conditions });
  };

  const updateFilter = (i, updated) => {
    const conditions = filters.conditions.map((f, idx) => idx === i ? updated : f);
    onChange({ ...filters, conditions });
  };

  const updateLogic = (val) => {
    setLogic(val);
    onChange({ ...filters, logic: val });
  };

  // Called when ExcelImportFilter applies — merge imported conditions into existing filters
  const handleExcelApply = (importedGroup) => {
    if (importedGroup.isDateRangeMode) {
      // Date range mode: pass groups array directly — sql_builder handles the nested OR
      onChange({
        logic: filters.logic || 'AND',
        conditions: filters.conditions,
        dateRangeGroups: importedGroup.groups,
      });
    } else {
      const merged = {
        logic: filters.logic || 'AND',
        conditions: [
          ...filters.conditions,
          ...importedGroup.conditions,
        ],
      };
      onChange(merged);
    }
  };

  return (
    <div className="form-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label className="form-label">Filters</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {filters.conditions.length > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {['AND', 'OR'].map(l => (
                <button
                  key={l}
                  className={`btn ${filters.logic === l ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '3px 10px', fontSize: 11 }}
                  onClick={() => updateLogic(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={addFilter}
            disabled={!table}
          >
            + Add Filter
          </button>
        </div>
      </div>

      {/* Date range groups indicator (from Excel import) */}
      {filters.dateRangeGroups && filters.dateRangeGroups.length > 0 && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(0,200,120,0.07)',
          border: '1px solid var(--green)',
          borderRadius: 'var(--radius)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
              ✓ Date Range Filter Active
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
              {filters.dateRangeGroups.length} rows from Excel — each with serial + date range (OR logic)
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '4px 10px', color: 'var(--text-2)' }}
            onClick={() => onChange({ logic: filters.logic, conditions: filters.conditions })}
          >
            ✕ Remove
          </button>
        </div>
      )}

      {/* Manual filters */}
      {filters.conditions.length === 0 && !filters.dateRangeGroups ? (
        <div style={{ padding: '12px 0', color: 'var(--text-2)', fontSize: 12 }}>
          No filters applied — all rows will be returned.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filters.conditions.map((f, i) => (
            <div key={i}>
              {i > 0 && (
                <div className="filter-logic-badge" style={{ marginBottom: 4 }}>
                  <span className="tag tag-amber">{filters.logic}</span>
                </div>
              )}
              <FilterRow selectedDb={selectedDb}
                row={f}
                columns={columns}
                table={table}
                onChange={(updated) => updateFilter(i, updated)}
                onRemove={() => removeFilter(i)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Excel import — shown only when a table is selected */}
      {table && (
        <ExcelImportFilter
          dbColumns={columns}
          onApply={handleExcelApply}
        />
      )}
    </div>
  );
}