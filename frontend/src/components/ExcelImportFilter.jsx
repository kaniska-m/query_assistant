import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

/*
  ExcelImportFilter
  ─────────────────
  Two modes:
  1. SIMPLE  – map one Excel column → one DB column (IN filter, existing behaviour)
  2. DATE RANGE – map: serial col + from-date col + to-date col
                  generates per-row  (SERIAL=x AND TIME>=from AND TIME<=to) OR ...
*/

const MODE_SIMPLE = 'simple';
const MODE_DATE   = 'date';

const fmt = (v) => {
  if (!v) return '';
  if (v instanceof Date) {
    const d = String(v.getDate()).padStart(2,'0');
    const m = String(v.getMonth()+1).padStart(2,'0');
    const y = v.getFullYear();
    return `${d}-${m}-${y}`;
  }
  // Excel serial number (number)
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      return `${String(d.d).padStart(2,'0')}-${String(d.m).padStart(2,'0')}-${d.y}`;
    }
  }
  return String(v).trim();
};

export default function ExcelImportFilter({ dbColumns = [], onApply }) {
  const fileRef = useRef(null);

  const [mode, setMode]               = useState(MODE_SIMPLE);
  const [fileName, setFileName]       = useState('');
  const [sheetNames, setSheetNames]   = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [excelCols, setExcelCols]     = useState([]);
  const [preview, setPreview]         = useState([]);
  const [allData, setAllData]         = useState({});   // { colHeader: [val,...] }
  const [rawRows, setRawRows]         = useState([]);   // full row objects for date mode
  const [workbook, setWorkbook]       = useState(null);
  const [expanded, setExpanded]       = useState(false);
  const [error, setError]             = useState('');

  // Simple mode
  const [mappings, setMappings]     = useState([{ excelCol: '', dbCol: '', operator: 'IN' }]);
  const [groupLogic, setGroupLogic] = useState('AND');

  // Date-range mode
  const [dateMap, setDateMap] = useState({
    serialCol:   '',   // excel col for serial number
    dbSerialCol: '',   // DB column  (e.g. SERIAL_NO)
    fromCol:     '',   // excel col for from-date
    dbFromCol:   '',   // DB column  (e.g. TIME_STAMP)
    toCol:       '',   // excel col for to-date
    dbToCol:     '',   // DB column  (e.g. TIME_STAMP)  often same as fromCol
  });

  // ── File reading ────────────────────────────────────────────────

  const readSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    // Use raw:false so dates come as formatted strings, but also keep raw:true for numbers
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
    if (!raw || raw.length < 2) { setError('Sheet is empty or has no data rows.'); return; }

    const headers = raw[0].map(String);
    const dataRows = raw.slice(1);

    const colData = {};
    headers.forEach((h, i) => {
      colData[h] = dataRows
        .map(row => {
          const v = row[i];
          if (v === '' || v === null || v === undefined) return '';
          if (v instanceof Date) return fmt(v);
          return String(v).trim();
        })
        .filter(v => v !== '' && v !== 'null' && v !== 'None');
    });

    // Row objects (keep original values for date parsing)
    const rowObjs = dataRows.map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });

    setExcelCols(headers);
    setAllData(colData);
    setRawRows(rowObjs);
    setPreview(dataRows.slice(0, 5));
    setMappings([{ excelCol: headers[0] || '', dbCol: '', operator: 'IN' }]);
    setError('');
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(''); setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setActiveSheet(wb.SheetNames[0]);
        readSheet(wb, wb.SheetNames[0]);
      } catch { setError('Could not read file. Make sure it is a valid Excel or CSV.'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (s) => { setActiveSheet(s); if (workbook) readSheet(workbook, s); };

  // ── Simple mode helpers ─────────────────────────────────────────

  const updateMapping = (idx, field, val) =>
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  const addMapping = () => {
    if (mappings.length >= 2) return;
    const unused = excelCols.find(c => !mappings.some(m => m.excelCol === c)) || '';
    setMappings(prev => [...prev, { excelCol: unused, dbCol: '', operator: 'IN' }]);
  };
  const removeMapping = (idx) => setMappings(prev => prev.filter((_, i) => i !== idx));

  // ── Apply simple ────────────────────────────────────────────────

  const applySimple = () => {
    setError('');
    const valid = mappings.filter(m => m.excelCol && m.dbCol);
    if (!valid.length) { setError('Map at least one Excel column to a DB column.'); return; }

    const conditions = valid.map(m => {
      const values = [...new Set(allData[m.excelCol] || [])];
      if (!values.length) { setError(`No values in column "${m.excelCol}".`); return null; }
      return { column: m.dbCol, operator: values.length === 1 ? '=' : 'IN', value: values.length === 1 ? values[0] : values };
    }).filter(Boolean);

    if (!conditions.length) return;
    onApply({ logic: groupLogic, conditions });
    setExpanded(false);
  };

  // ── Apply date-range ────────────────────────────────────────────
  // Generates one condition group per Excel row:
  //   (SERIAL_NO = 'X' AND TIME_STAMP >= TO_DATE('DD-MM-YYYY','DD-MM-YYYY') AND TIME_STAMP <= ...)
  // All groups joined with OR

  const applyDateRange = () => {
    setError('');
    const { serialCol, dbSerialCol, fromCol, dbFromCol, toCol, dbToCol } = dateMap;

    if (!serialCol || !dbSerialCol || !fromCol || !dbFromCol || !toCol || !dbToCol) {
      setError('Please fill in all six fields (serial, from-date, to-date columns for both Excel and DB).');
      return;
    }

    // Build per-row condition groups
    const rowGroups = rawRows
      .filter(row => row[serialCol] && row[fromCol] && row[toCol])
      .map(row => {
        const serial  = String(row[serialCol]).trim();
        const fromDt  = fmt(row[fromCol]);
        const toDt    = fmt(row[toCol]);
        if (!serial || !fromDt || !toDt) return null;

        return {
          logic: 'AND',
          conditions: [
            { column: dbSerialCol, operator: '=',   value: serial },
            { column: dbFromCol,   operator: '>=',  value: `TO_DATE('${fromDt}','DD-MM-YYYY')`, raw: true },
            { column: dbToCol,     operator: '<=',  value: `TO_DATE('${toDt}','DD-MM-YYYY')`,   raw: true },
          ],
        };
      })
      .filter(Boolean);

    if (!rowGroups.length) { setError('No valid rows found with serial + from-date + to-date.'); return; }

    // Pass as a special nested structure — the parent FilterBuilder will handle it
    onApply({ logic: 'OR', groups: rowGroups, isDateRangeMode: true });
    setExpanded(false);
  };

  // ── Value badge ─────────────────────────────────────────────────

  const ValueBadge = ({ excelCol }) => {
    if (!excelCol || !allData[excelCol]) return null;
    const unique = [...new Set(allData[excelCol])];
    return (
      <span style={{ fontSize: 11, color: 'var(--text-2)', marginLeft: 8 }}>
        {unique.length} value{unique.length !== 1 ? 's' : ''}
        {unique.length <= 2
          ? `: ${unique.join(', ')}`
          : `: ${unique.slice(0,2).join(', ')} … +${unique.length-2} more`}
      </span>
    );
  };

  const clearAll = () => {
    setFileName(''); setExcelCols([]); setPreview([]); setAllData({}); setRawRows([]);
    setMappings([{ excelCol: '', dbCol: '', operator: 'IN' }]); setError('');
    setWorkbook(null); setSheetNames([]);
    setDateMap({ serialCol:'', dbSerialCol:'', fromCol:'', dbFromCol:'', toCol:'', dbToCol:'' });
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Shared sub-components ───────────────────────────────────────

  const Label = ({ children }) => (
    <div style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
      {children}
    </div>
  );

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius)', marginTop: 10, overflow: 'hidden' }}>

      {/* Toggle header */}
      <button onClick={() => setExpanded(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 14px', background: 'var(--bg-2)', border: 'none',
        cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 500,
        color: 'var(--text-0)',
      }}>
        <span>📂</span> Import filter values from Excel / CSV
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-2)', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </button>

      {expanded && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Mode selector */}
          <div>
            <SectionTitle>Import Mode</SectionTitle>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: MODE_SIMPLE, label: '📋 Simple (IN filter)', desc: 'Map column values to a DB column' },
                { id: MODE_DATE,   label: '📅 Date Range per Row', desc: 'Serial + FROM date + TO date per row' },
              ].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  flex: 1, padding: '8px 12px', borderRadius: 'var(--radius)',
                  border: mode === m.id ? '1.5px solid var(--amber)' : '1px solid var(--border)',
                  background: mode === m.id ? 'rgba(255,180,0,0.07)' : 'var(--bg-0)',
                  color: mode === m.id ? 'var(--amber)' : 'var(--text-2)',
                  cursor: 'pointer', textAlign: 'left', fontSize: 12,
                }}>
                  <div style={{ fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload */}
          <div>
            <SectionTitle>Step 1 — Upload file</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => fileRef.current.click()}>
                📂 Choose file
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />
              {fileName
                ? <span style={{ fontSize: 12, color: 'var(--text-0)', fontWeight: 500 }}>{fileName}</span>
                : <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Supports .xlsx, .xls, .csv</span>}
            </div>
          </div>

          {/* Sheet selector */}
          {sheetNames.length > 1 && (
            <div>
              <SectionTitle>Sheet</SectionTitle>
              <select className="form-control" value={activeSheet} onChange={e => handleSheetChange(e.target.value)} style={{ maxWidth: 240 }}>
                {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* ── SIMPLE MODE ─────────────────────────────────────── */}
          {mode === MODE_SIMPLE && excelCols.length > 0 && (
            <div>
              <SectionTitle>Step 2 — Map columns</SectionTitle>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
                Choose which Excel column maps to which database column. Up to 2 mappings.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mappings.map((m, idx) => (
                  <div key={idx}>
                    {idx > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        {['AND','OR'].map(l => (
                          <button key={l} className={`btn ${groupLogic===l?'btn-primary':'btn-ghost'}`} style={{ padding:'2px 10px', fontSize:11 }} onClick={() => setGroupLogic(l)}>{l}</button>
                        ))}
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 8, alignItems: 'center' }}>
                      <div>
                        <Label>Excel column</Label>
                        <select className="form-control" value={m.excelCol} onChange={e => updateMapping(idx,'excelCol',e.target.value)}>
                          <option value="">— select —</option>
                          {excelCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{ fontSize: 16, color: 'var(--text-2)', paddingTop: 16 }}>→</div>
                      <div>
                        <Label>Database column</Label>
                        <select className="form-control" value={m.dbCol} onChange={e => updateMapping(idx,'dbCol',e.target.value)}>
                          <option value="">— select —</option>
                          {dbColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div style={{ paddingTop: 16 }}>
                        {mappings.length > 1 && (
                          <button className="btn btn-danger" style={{ padding:'6px 10px', fontSize:12 }} onClick={() => removeMapping(idx)}>✕</button>
                        )}
                      </div>
                    </div>
                    {m.excelCol && <ValueBadge excelCol={m.excelCol} />}
                  </div>
                ))}
              </div>
              {mappings.length < 2 && excelCols.length > 1 && (
                <button className="btn btn-ghost" style={{ marginTop:10, fontSize:12, padding:'5px 12px' }} onClick={addMapping}>+ Add another column mapping</button>
              )}
            </div>
          )}

          {/* ── DATE RANGE MODE ──────────────────────────────────── */}
          {mode === MODE_DATE && excelCols.length > 0 && (
            <div>
              <SectionTitle>Step 2 — Map serial + date range columns</SectionTitle>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>
                Each row in the Excel will become:<br/>
                <code style={{ fontSize: 11, background: 'var(--bg-0)', padding: '2px 6px', borderRadius: 4 }}>
                  (SERIAL = 'x' AND TIME &gt;= from_date AND TIME &lt;= to_date)
                </code>
                &nbsp;joined with OR across all rows.
              </div>

              {/* Serial mapping */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <Label>Excel — Serial number column</Label>
                  <select className="form-control" value={dateMap.serialCol} onChange={e => setDateMap(p => ({...p, serialCol: e.target.value}))}>
                    <option value="">— select —</option>
                    {excelCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {dateMap.serialCol && <ValueBadge excelCol={dateMap.serialCol} />}
                </div>
                <div style={{ fontSize: 16, color: 'var(--text-2)', paddingTop: 20, textAlign: 'center' }}>→</div>
                <div>
                  <Label>DB — Serial column</Label>
                  <select className="form-control" value={dateMap.dbSerialCol} onChange={e => setDateMap(p => ({...p, dbSerialCol: e.target.value}))}>
                    <option value="">— select —</option>
                    {dbColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 12px' }} />

              {/* From date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <Label>Excel — FROM date column</Label>
                  <select className="form-control" value={dateMap.fromCol} onChange={e => setDateMap(p => ({...p, fromCol: e.target.value}))}>
                    <option value="">— select —</option>
                    {excelCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {dateMap.fromCol && <ValueBadge excelCol={dateMap.fromCol} />}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', paddingTop: 20, textAlign: 'center' }}>→ &gt;=</div>
                <div>
                  <Label>DB — Date/Time column</Label>
                  <select className="form-control" value={dateMap.dbFromCol} onChange={e => setDateMap(p => ({...p, dbFromCol: e.target.value}))}>
                    <option value="">— select —</option>
                    {dbColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* To date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10 }}>
                <div>
                  <Label>Excel — TO date column</Label>
                  <select className="form-control" value={dateMap.toCol} onChange={e => setDateMap(p => ({...p, toCol: e.target.value}))}>
                    <option value="">— select —</option>
                    {excelCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {dateMap.toCol && <ValueBadge excelCol={dateMap.toCol} />}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', paddingTop: 20, textAlign: 'center' }}>→ &lt;=</div>
                <div>
                  <Label>DB — Date/Time column</Label>
                  <select className="form-control" value={dateMap.dbToCol} onChange={e => setDateMap(p => ({...p, dbToCol: e.target.value}))}>
                    <option value="">— select —</option>
                    {dbColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Row count preview */}
              {dateMap.serialCol && dateMap.fromCol && dateMap.toCol && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                    {rawRows.filter(r => r[dateMap.serialCol] && r[dateMap.fromCol] && r[dateMap.toCol]).length}
                  </span>
                  <span style={{ color: 'var(--text-2)' }}> valid rows detected — will generate that many OR conditions</span>
                </div>
              )}
            </div>
          )}

          {/* Preview table (first 5 rows) */}
          {preview.length > 0 && excelCols.length > 0 && (
            <div>
              <SectionTitle>File preview (first {preview.length} rows)</SectionTitle>
              <div style={{ overflowX: 'auto', fontSize: 11, border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {excelCols.map(c => (
                        <th key={c} style={{ padding:'6px 10px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', textAlign:'left', fontWeight:600, color:'var(--text-0)', whiteSpace:'nowrap' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, ri) => (
                      <tr key={ri}>
                        {excelCols.map((_, ci) => (
                          <td key={ci} style={{ padding:'5px 10px', borderBottom: ri < preview.length-1 ? '1px solid var(--border)' : 'none', color:'var(--text-0)', whiteSpace:'nowrap' }}>
                            {String(row[ci] instanceof Date ? fmt(row[ci]) : (row[ci] ?? ''))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <div className="alert alert-error" style={{ fontSize: 12 }}>⚠ {error}</div>}

          {/* Apply / Clear */}
          {excelCols.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ fontSize: 13 }}
                onClick={mode === MODE_DATE ? applyDateRange : applySimple}
                disabled={
                  mode === MODE_SIMPLE
                    ? !mappings.some(m => m.excelCol && m.dbCol)
                    : !dateMap.serialCol || !dateMap.dbSerialCol || !dateMap.fromCol || !dateMap.dbFromCol || !dateMap.toCol || !dateMap.dbToCol
                }
              >
                ✓ Apply as filter
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={clearAll}>✕ Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}