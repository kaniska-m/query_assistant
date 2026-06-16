export const SCHEMAS = {
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
      { label: 'OLT IP',       col: 'OLT_IP',       type: 'text'   },
      { label: 'ONT IP',       col: 'ONT_IP',       type: 'text'   },
      { label: 'Location ID',  col: 'LOCATION_ID',  type: 'number' },
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
      { label: 'OLT IP',      col: 'OLT_IP',      type: 'text'   },
      { label: 'ONT IP',      col: 'ONT_IP',      type: 'text'   },
      { label: 'Location ID', col: 'LOCATION_ID', type: 'number' },
      { label: 'CCU',         col: 'CCU',         type: 'number' },
    ],
  },
};

export const QUICK_COLS = {
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

export const ORDER_COLS = {
  RM_ONT: ['TIME_STAMP', 'SERIAL_NO', 'APP_STATUS', 'PHY_STATUS', 'STATE', 'STATE_CHANGE_TIME', 'COMMISSION_DATE', 'NW_ENTRY_TIME'],
  RM_ONT_HISTORY: ['TIME_STAMP', 'SERIAL_NO', 'APP_STATUS', 'PHY_STATUS', 'STATE', 'STATE_CHANGE_TIME', 'COMMISSION_DATE', 'NW_ENTRY_TIME'],
};

export function buildSQL(table, form) {
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
    if (val)
      conditions.push(f.type === 'number' ? `${f.col} = ${val}` : `${f.col} = '${val}'`);
  });

  const cols = form.selectedCols?.length ? form.selectedCols.join(', ') : '*';
  let sql = `SELECT ${cols}\nFROM ${table}`;
  sql += conditions.length > 0
    ? `\nWHERE ` + conditions.join('\n  AND ') + `\n  AND ROWNUM <= ${form.limit || 100}`
    : `\nWHERE ROWNUM <= ${form.limit || 100}`;
  if (form.orderBy)
    sql += `\nORDER BY ${form.orderBy} ${form.orderDir || 'DESC'}`;
  return sql;
}

export const defaultForm = (schema) => ({
  serialNo: '', dateFrom: '', dateTo: '',
  dateCol: schema.dateColOptions[0].col,
  appStatus: '', state: '', phyStatus: '',
  extra: {}, selectedCols: [],
  orderBy: 'TIME_STAMP', orderDir: 'DESC', limit: '100',
});
