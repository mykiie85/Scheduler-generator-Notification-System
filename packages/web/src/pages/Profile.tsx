import { useState } from 'react';
import { Button, FormGroup, InputGroup, Callout } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Profile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    setLoading(true);
    setError('');
    try {
      await api.put('/users/me', { fullName, email });
      setSuccess('Profile updated');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Request reset token then use it
      const res = await api.post('/auth/forgot-password', { email: user?.email });
      const token = res.data._devToken;
      if (token) {
        await api.post('/auth/reset-password', { token, newPassword });
        setSuccess('Password changed');
        setOldPassword('');
        setNewPassword('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Profile</h2>
        <p>Update your account information</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }}>{error}</Callout>}
      {success && <Callout intent="success" style={{ marginBottom: 12 }}>{success}</Callout>}

      <div className="form-section" style={{ maxWidth: 500 }}>
        <h4>Account Details</h4>
        <FormGroup label="Full Name">
          <InputGroup value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormGroup>
        <FormGroup label="Email">
          <InputGroup value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </FormGroup>
        <FormGroup label="Role">
          <InputGroup value={user?.role || ''} disabled />
        </FormGroup>
        <Button intent="primary" text="Update Profile" loading={loading} onClick={handleUpdateProfile} />
      </div>

      <div className="form-section" style={{ maxWidth: 500, marginTop: 16 }}>
        <h4>Change Password</h4>
        <FormGroup label="New Password">
          <InputGroup
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            placeholder="Min 6 characters"
          />
        </FormGroup>
        <Button intent="warning" text="Change Password" loading={loading} onClick={handleChangePassword} />
      </div>
    </div>
  );
}
