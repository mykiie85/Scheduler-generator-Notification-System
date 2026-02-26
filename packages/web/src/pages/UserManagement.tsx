import { useState, useEffect } from 'react';
import {
  Button,
  HTMLTable,
  HTMLSelect,
  Callout,
  Tag,
  Spinner,
} from '@blueprintjs/core';
import api from '../api/client';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  approvalStatus: string;
  createdAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/users/${id}/approve`);
      fetchUsers();
    } catch {
      setError('Approve failed');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.put(`/users/${id}/reject`);
      fetchUsers();
    } catch {
      setError('Reject failed');
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await api.put(`/users/${id}/role`, { role });
      fetchUsers();
    } catch {
      setError('Role update failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch {
      setError('Delete failed');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h2>User Management</h2>
        <p>Approve accounts and manage roles</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }}>{error}</Callout>}

      <div className="staff-table-container">
        <HTMLTable striped compact style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>
                  <HTMLSelect
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    minimal
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="VIEWER">Viewer</option>
                  </HTMLSelect>
                </td>
                <td>
                  <Tag
                    intent={
                      u.approvalStatus === 'APPROVED' ? 'success' :
                      u.approvalStatus === 'REJECTED' ? 'danger' : 'warning'
                    }
                    minimal
                  >
                    {u.approvalStatus}
                  </Tag>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                <td>
                  {u.approvalStatus === 'PENDING' && (
                    <>
                      <Button minimal small icon="tick" intent="success" onClick={() => handleApprove(u.id)} />
                      <Button minimal small icon="cross" intent="danger" onClick={() => handleReject(u.id)} />
                    </>
                  )}
                  <Button minimal small icon="trash" intent="danger" onClick={() => handleDelete(u.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      </div>
    </div>
  );
}
