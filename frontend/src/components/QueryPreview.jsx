import { useState } from 'react';

const KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'LIMIT', 'LIKE', 'IN', 'BETWEEN', 'IS NULL', 'NOT', 'ASC', 'DESC'];

function highlightSQL(sql) {
  if (!sql) return '';
  let result = sql;
  KEYWORDS.forEach(kw => {
    result = result.replace(new RegExp(`\\b(${kw})\\b`, 'gi'), `<span class="sql-keyword">$1</span>`);
  });
  result = result.replace(/'([^']*)'/g, `<span class="sql-string">'$1'</span>`);
  return result;
}

export default function QueryPreview({ sql, onEdit }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!sql) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(sql).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      } else {
        // Fallback for HTTP (non-secure context)
        const ta = document.createElement('textarea');
        ta.value = sql;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <span className="card-title">Generated SQL</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {onEdit && (
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onEdit}>
              ✏️ Edit
            </button>
          )}
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={copy} disabled={!sql}>
            {copied ? '✓ Copied' : '⎘ Copy'}
          </button>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {sql ? (
          <pre
            className="sql-block"
            style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}
            dangerouslySetInnerHTML={{ __html: highlightSQL(sql) }}
          />
        ) : (
          <div className="empty-state" style={{ padding: '24px' }}>
            <div className="empty-icon">◌</div>
            <p>Query will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}