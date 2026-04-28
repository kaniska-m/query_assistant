import { Link } from 'react-router-dom';

const cards = [
  {
    to: '/executor',
    icon: '⌨',
    title: 'SQL Executor',
    desc: 'Write and run raw SQL queries directly against the database. Full control, instant results.',
    color: 'var(--blue)',
  },
  {
    to: '/builder',
    icon: '⊞',
    title: 'Query Builder',
    desc: 'Build queries visually — select tables, columns, and filters with no SQL required.',
    color: 'var(--amber)',
  },
  {
    to: '/nl',
    icon: '◈',
    title: 'Natural Language',
    desc: 'Describe what you want in plain English and get SQL generated automatically.',
    color: 'var(--purple)',
  },
];

export default function Home() {
  return (
    <div className="page-content">
      <div style={{ marginBottom: 32 }}>
        <div className="page-title">Query Assistant</div>
        <div className="page-subtitle" style={{ marginTop: 6 }}>
          Connected to <span style={{ color: 'var(--green)' }}>gemsdb</span> — choose a mode to begin
        </div>
      </div>

      <div className="home-grid">
        {cards.map(c => (
          <Link key={c.to} to={c.to} className="home-card">
            <div className="home-card-arrow">→</div>
            <div className="home-card-icon" style={{ color: c.color }}>{c.icon}</div>
            <div className="home-card-title">{c.title}</div>
            <div className="home-card-desc">{c.desc}</div>
          </Link>
        ))}
      </div>

      <div className="divider" style={{ marginTop: 32 }} />

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1', minWidth: 240 }}>
          <div className="card-header"><span className="card-title">Database Info</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-2)' }}>Database</span>
                <span className="tag tag-green">gemsdb</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-2)' }}>Engine</span>
                <span style={{ color: 'var(--text-1)' }}>Oracle DB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-2)' }}>Backend</span>
                <span style={{ color: 'var(--text-1)' }}>FastAPI</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: '2', minWidth: 280 }}>
          <div className="card-header"><span className="card-title">Quick Tips</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
              <div>→ Use <span style={{ color: 'var(--amber)' }}>Query Builder</span> to explore tables without writing SQL</div>
              <div>→ Add filters with <span style={{ color: 'var(--amber)' }}>AND/OR logic</span> to narrow results</div>
              <div>→ Generated queries are editable before execution</div>
              <div>→ All executed queries are saved in <Link to="/history" style={{ color: 'var(--blue)' }}>History</Link></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
