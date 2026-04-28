import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import QueryExecutor from './pages/QueryExecutor';
import QueryBuilderPage from './pages/QueryBuilderPage';
import NLQueryPage from './pages/NLQueryPage';
import HistoryPage from './pages/HistoryPage';

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/executor', label: '⌨ SQL' },
  { to: '/builder', label: '⊞ Builder' },
  { to: '/nl', label: '◈ NL Query' },
  { to: '/history', label: '⊙ History' },
];

function Shell({ history, onAddHistory }) {
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-logo">
          <div className="logo-dot" />
          QueryAssist
        </div>
        <span className="topbar-db-badge">● gemsdb</span>

        <nav className="topbar-nav">
          {NAV_LINKS.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            >
              {label}
              {to === '/history' && history.length > 0 && (
                <span style={{
                  background: 'var(--amber)',
                  color: '#000',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 10,
                  minWidth: 16,
                  textAlign: 'center'
                }}>
                  {history.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/executor" element={<QueryExecutor onAddHistory={onAddHistory} />} />
        <Route path="/builder" element={<QueryBuilderPage onAddHistory={onAddHistory} />} />
        <Route path="/nl" element={<NLQueryPage onAddHistory={onAddHistory} />} />
        <Route path="/history" element={<HistoryPage history={history} onAddHistory={onAddHistory} />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const [history, setHistory] = useState([]);

  const addHistory = (entry) => {
    setHistory(prev => [...prev, entry]);
  };

  return (
    <BrowserRouter>
      <Shell history={history} onAddHistory={addHistory} />
    </BrowserRouter>
  );
}
