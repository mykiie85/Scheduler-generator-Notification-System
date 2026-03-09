import { useState, useEffect } from 'react';
import {
  Button,
  HTMLTable,
  HTMLSelect,
  Callout,
  Tag,
  Spinner,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  InputGroup,
} from '@blueprintjs/core';
import api from '../api/client';

interface User {
  id: string;
  fileNo: string | null;
  email: string;
  fullName: string;
  phone: string | null;
  title: string | null;
  role: string;
  approvalStatus: string;
  createdAt: string;
}

const EMPTY_FORM = { fileNo: '', email: '', fullName: '', phone: '', title: '', role: 'MANAGER', password: 'LabScheduler2026!' };

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditId(u.id);
    setForm({
      fileNo: u.fileNo || '',
      email: u.email,
      fullName: u.fullName,
      phone: u.phone || '',
      title: u.title || '',
      role: u.role,
      password: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editId) {
        const { password, ...data } = form;
        await api.put(`/users/${editId}`, data);
      } else {
        await api.post('/users', form);
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>User Management</h2>
          <p>Add, edit and manage app users</p>
        </div>
        <Button intent="primary" icon="add" text="Add User" onClick={openAdd} />
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }}>{error}</Callout>}

      <div className="staff-table-container">
        <HTMLTable striped compact style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>File No</th>
              <th>Name</th>
              <th>Title</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontSize: 12 }}>{u.fileNo || '-'}</td>
                <td>{u.fullName}</td>
                <td style={{ fontSize: 12 }}>{u.title || '-'}</td>
                <td style={{ fontSize: 12 }}>{u.email}</td>
                <td style={{ fontSize: 12 }}>{u.phone || '-'}</td>
                <td>
                  <Tag minimal intent={u.role === 'ADMIN' ? 'danger' : u.role === 'MANAGER' ? 'primary' : 'none'}>
                    {u.role}
                  </Tag>
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
                <td>
                  <Button minimal small icon="edit" intent="primary" onClick={() => openEdit(u)} />
                  <Button minimal small icon="trash" intent="danger" onClick={() => handleDelete(u.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      </div>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editId ? 'Edit User' : 'Add User'}
        style={{ width: 440 }}
      >
        <DialogBody>
          <div className="dialog-row" style={{ display: 'flex', gap: 12 }}>
            <FormGroup label="File No" style={{ flex: 1 }}>
              <InputGroup value={form.fileNo} onChange={(e) => setForm({ ...form, fileNo: e.target.value })} placeholder="FRP-0000" />
            </FormGroup>
            <FormGroup label="Title" style={{ flex: 1 }}>
              <InputGroup value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lab Manager" />
            </FormGroup>
          </div>
          <FormGroup label="Full Name" labelInfo="(required)">
            <InputGroup value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full name" />
          </FormGroup>
          <FormGroup label="Email" labelInfo="(required)">
            <InputGroup value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" type="email" />
          </FormGroup>
          <FormGroup label="Phone">
            <InputGroup value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0687 729 501" />
          </FormGroup>
          <FormGroup label="Role">
            <HTMLSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} fill>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="VIEWER">Viewer</option>
            </HTMLSelect>
          </FormGroup>
          {!editId && (
            <FormGroup label="Password" helperText="Default: LabScheduler2026!">
              <InputGroup value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" />
            </FormGroup>
          )}
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button text="Cancel" onClick={() => setDialogOpen(false)} />
              <Button intent="primary" text={editId ? 'Save' : 'Create User'} loading={saving} onClick={handleSave} />
            </>
          }
        />
      </Dialog>
    </div>
  );
}
