import { useState, useEffect } from 'react';
import {
  Button,
  HTMLTable,
  InputGroup,
  Dialog,
  FormGroup,
  HTMLSelect,
  Callout,
  Tag,
  Spinner,
} from '@blueprintjs/core';
import api from '../api/client';

interface Staff {
  id: string;
  fileNo: string;
  checkNo: string | null;
  fullName: string;
  category: string;
  primarySection: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

const SECTIONS = ['Hematology', 'Chemistry', 'Microbiology', 'Serology', 'Phlebotomy', 'Reception/LIS', 'TB', 'Quality'];
const CATEGORIES = ['LAB_SCIENTIST', 'LAB_TECHNOLOGIST', 'LAB_ATTENDANT', 'ATTENDANT'];

export default function StaffDatabase() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    fileNo: '',
    fullName: '',
    category: 'LAB_SCIENTIST',
    primarySection: 'Hematology',
    phone: '',
    email: '',
  });
  const [error, setError] = useState('');

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff');
      setStaff(res.data);
    } catch {
      setError('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const filtered = staff.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.fileNo.toLowerCase().includes(search.toLowerCase()) ||
      s.primarySection.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ fileNo: '', fullName: '', category: 'DEGREE', primarySection: 'Hematology', phone: '', email: '' });
    setDialogOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditing(s);
    setForm({
      fileNo: s.fileNo,
      fullName: s.fullName,
      category: s.category,
      primarySection: s.primarySection,
      phone: s.phone || '',
      email: s.email || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/staff/${editing.id}`, form);
      } else {
        await api.post('/staff', form);
      }
      setDialogOpen(false);
      fetchStaff();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      await api.delete(`/staff/${id}`);
      fetchStaff();
    } catch {
      setError('Delete failed');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h2>Staff Database</h2>
        <p>{staff.length} staff members</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }}>{error}</Callout>}

      <div className="action-bar" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <InputGroup
          leftIcon="search"
          placeholder="Search by name, file no, or section..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button intent="primary" icon="add" text="Add Staff" onClick={openAdd} />
      </div>

      <div className="staff-table-container">
        <HTMLTable striped compact interactive style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>#</th>
              <th>File No</th>
              <th>Full Name</th>
              <th>Category</th>
              <th>Section</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td>{s.fileNo}</td>
                <td>{s.fullName}</td>
                <td><Tag minimal>{s.category}</Tag></td>
                <td>{s.primarySection}</td>
                <td>{s.phone || '-'}</td>
                <td>
                  <Tag intent={s.isActive ? 'success' : 'none'} minimal>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </Tag>
                </td>
                <td>
                  <Button minimal small icon="edit" onClick={() => openEdit(s)} />
                  <Button minimal small icon="trash" intent="danger" onClick={() => handleDelete(s.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      </div>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Edit Staff' : 'Add Staff'}
        style={{ width: 500 }}
      >
        <div style={{ padding: 20 }}>
          <FormGroup label="File No">
            <InputGroup value={form.fileNo} onChange={(e) => setForm({ ...form, fileNo: e.target.value })} />
          </FormGroup>
          <FormGroup label="Full Name">
            <InputGroup value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </FormGroup>
          <FormGroup label="Category">
            <HTMLSelect value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </HTMLSelect>
          </FormGroup>
          <FormGroup label="Section">
            <HTMLSelect value={form.primarySection} onChange={(e) => setForm({ ...form, primarySection: e.target.value })}>
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </HTMLSelect>
          </FormGroup>
          <FormGroup label="Phone">
            <InputGroup value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormGroup>
          <FormGroup label="Email">
            <InputGroup value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
          </FormGroup>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button text="Cancel" onClick={() => setDialogOpen(false)} />
            <Button intent="primary" text="Save" onClick={handleSave} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
