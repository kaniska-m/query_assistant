import { useState } from 'react';

// ── Hardcoded credentials — change these as needed ──────────────
const USERS = [
  { username: 'admin',   password: 'admin123'  },
  { username: 'trainee', password: 'trainee123' },
];

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    // Simulate a small delay for realism
    setTimeout(() => {
      const match = USERS.find(
        u => u.username === username.trim() && u.password === password
      );
      if (match) {
        // Save to sessionStorage so refresh keeps you logged in
        sessionStorage.setItem('qa_user', match.username);
        onLogin(match.username);
      } else {
        setError('Invalid username or password.');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--mono)',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'var(--sans)',
            fontSize: 26,
            fontWeight: 800,
            color: 'var(--amber)',
            letterSpacing: '-0.5px',
            marginBottom: 8,
          }}>
            <div style={{
              width: 12, height: 12,
              background: 'var(--amber)',
              borderRadius: '50%',
              boxShadow: '0 0 10px var(--amber)',
            }} />
            QueryAssist
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
            Sign in to continue
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '32px 28px',
        }}>

          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Username */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Username
              </label>
              <input
                className="form-control"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                autoFocus
                autoComplete="username"
                style={{ fontSize: 13 }}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                  style={{ fontSize: 13, paddingRight: 40, width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(o => !o)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: 'var(--text-2)',
                    padding: '0 4px',
                  }}
                  title={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(255,95,109,0.1)',
                border: '1px solid rgba(255,95,109,0.3)',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--red)',
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: 13,
                fontWeight: 600,
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading
                ? <><div className="spinner" /> Signing in...</>
                : '→ Sign In'
              }
            </button>

          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-2)' }}>
          QueryAssist · CDOT Internship Project
        </div>

      </div>
    </div>
  );
}