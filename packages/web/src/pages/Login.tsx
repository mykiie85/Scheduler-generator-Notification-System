import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, FormGroup, InputGroup, Callout } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56">
            <circle cx="32" cy="32" r="30" fill="#0f3c68"/>
            {/* Microscope body */}
            <rect x="28" y="14" width="8" height="4" rx="1" fill="#4fc3f7"/>
            <rect x="30" y="18" width="4" height="18" rx="1" fill="#fff"/>
            {/* Eyepiece */}
            <rect x="29" y="11" width="6" height="4" rx="2" fill="#fff"/>
            {/* Objective lens */}
            <ellipse cx="32" cy="37" rx="3" ry="2" fill="#4fc3f7"/>
            {/* Stage */}
            <rect x="24" y="39" width="16" height="3" rx="1" fill="#fff"/>
            {/* Arm curve */}
            <path d="M34 18 Q40 20 40 30 L40 39" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            {/* Base */}
            <rect x="22" y="44" width="20" height="3" rx="1.5" fill="#fff"/>
            <rect x="26" y="42" width="12" height="3" rx="1" fill="#b0cfe0"/>
            {/* Stage clips */}
            <line x1="25" y1="40" x2="27" y2="40" stroke="#4fc3f7" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="37" y1="40" x2="39" y2="40" stroke="#4fc3f7" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Light dot */}
            <circle cx="32" cy="49" r="1.5" fill="#4fc3f7" opacity="0.8"/>
          </svg>
        </div>
        <h2>Lab Scheduler</h2>
        <p className="subtitle">ISO 15189 Staff Scheduling System</p>

        {error && <Callout intent="danger" style={{ marginBottom: 16 }}>{error}</Callout>}

        <form onSubmit={handleLogin}>
          <FormGroup label="Email">
            <InputGroup
              leftIcon="envelope"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
            />
          </FormGroup>
          <FormGroup label="Password">
            <InputGroup
              leftIcon="lock"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
            />
          </FormGroup>
          <Button
            intent="primary"
            fill
            type="submit"
            loading={loading}
            text="Sign In"
          />
        </form>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#8a9bb5', marginTop: 16 }}>
          Contact admin for account access
        </p>
      </div>
    </div>
  );
}
