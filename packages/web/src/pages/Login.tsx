import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, FormGroup, InputGroup, Callout, Tabs, Tab } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [tab, setTab] = useState<string>('login');
  const [email, setEmail] = useState('mike.sanga@lab.go.tz');
  const [password, setPassword] = useState('admin123');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const msg = await register(email, password, fullName);
      setSuccess(msg);
      setTab('login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSuccess(data.message);
    } catch {
      setError('Failed to send reset email');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Lab Scheduler</h2>
        <p className="subtitle">ISO 15189 Staff Scheduling System</p>

        {error && <Callout intent="danger" style={{ marginBottom: 16 }}>{error}</Callout>}
        {success && <Callout intent="success" style={{ marginBottom: 16 }}>{success}</Callout>}

        <Tabs id="auth-tabs" selectedTabId={tab} onChange={(id) => setTab(id as string)}>
          <Tab
            id="login"
            title="Sign In"
            panel={
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
                  style={{ marginBottom: 8 }}
                />
                <Button minimal small onClick={handleForgotPassword} text="Forgot password?" />
              </form>
            }
          />
          <Tab
            id="register"
            title="Create Account"
            panel={
              <form onSubmit={handleRegister}>
                <FormGroup label="Full Name">
                  <InputGroup
                    leftIcon="person"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </FormGroup>
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
                    placeholder="Min 6 characters"
                    type="password"
                  />
                </FormGroup>
                <Button intent="primary" fill type="submit" loading={loading} text="Create Account" />
              </form>
            }
          />
        </Tabs>
      </div>
    </div>
  );
}
