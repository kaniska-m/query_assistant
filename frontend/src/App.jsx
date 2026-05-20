import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import QueryExecutor from './pages/QueryExecutor';
import QueryBuilderPage from './pages/QueryBuilderPage';
import NLQueryPage from './pages/NLQueryPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/executor', label: '⌨ SQL' },
  { to: '/builder', label: '⊞ Builder' },
  { to: '/nl', label: '◈ NL Query' },
  { to: '/history', label: '⊙ History' },
];

function Shell({ history, onAddHistory, user, onLogout, selectedDb, onSelectDb }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useState(() => {
    document.documentElement.setAttribute('data-theme', theme);
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-logo">
          <div className="logo-dot" />
          QueryAssist
        </div>

        {/* Active DB badge in topbar */}
        {selectedDb ? (
          <span className="topbar-db-badge" style={{ color: 'var(--green)' }}>
            ● {selectedDb}
          </span>
        ) : (
          <span className="topbar-db-badge" style={{ color: 'var(--text-2)', fontStyle: 'italic' }}>
            ○ no db selected
          </span>
        )}

        <nav className="topbar-nav">
          <button
            className="nav-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ fontSize: 15, padding: '6px 10px' }}
          >
            {theme === 'dark' ? '☀' : '◑'}
          </button>

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
                  textAlign: 'center',
                }}>
                  {history.length}
                </span>
              )}
            </NavLink>
          ))}

          {/* Logged-in user + logout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginLeft: 8,
            paddingLeft: 12,
            borderLeft: '1px solid var(--border)',
          }}>
            <span style={{
              fontSize: 11,
              color: 'var(--text-1)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              <span style={{ color: 'var(--amber)' }}>◉</span>
              {user}
            </span>
            <button
              className="nav-btn"
              onClick={onLogout}
              title="Sign out"
              style={{ fontSize: 11, padding: '4px 10px', color: 'var(--text-2)' }}
            >
              ⎋ Sign out
            </button>
          </div>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={
          <Home selectedDb={selectedDb} onSelectDb={onSelectDb} />
        } />
        <Route path="/executor" element={
          <QueryExecutor onAddHistory={onAddHistory} selectedDb={selectedDb} />
        } />
        <Route path="/builder" element={
          <QueryBuilderPage onAddHistory={onAddHistory} selectedDb={selectedDb} />
        } />
        <Route path="/nl" element={
          <NLQueryPage onAddHistory={onAddHistory} selectedDb={selectedDb} />
        } />
        <Route path="/history" element={
          <HistoryPage history={history} onAddHistory={onAddHistory} />
        } />
      </Routes>
    </div>
  );
}

export default function App() {
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(() => sessionStorage.getItem('qa_user') || null);
  const [selectedDb, setSelectedDb] = useState(
    () => sessionStorage.getItem('qa_db') || ''
  );

  const addHistory = (entry) => setHistory(prev => [...prev, entry]);

  const handleLogin = (username) => setUser(username);

  const handleLogout = () => {
    sessionStorage.removeItem('qa_user');
    sessionStorage.removeItem('qa_db');
    setUser(null);
    setHistory([]);
    setSelectedDb('');
  };

  const handleSelectDb = (dbName) => {
    setSelectedDb(dbName);
    sessionStorage.setItem('qa_db', dbName);
  };

  if (!user) {
    return (
      <BrowserRouter>
        <LoginPage onLogin={handleLogin} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Shell
        history={history}
        onAddHistory={addHistory}
        user={user}
        onLogout={handleLogout}
        selectedDb={selectedDb}
        onSelectDb={handleSelectDb}
      />
    </BrowserRouter>
  );
}
