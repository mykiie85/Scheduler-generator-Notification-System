import { useState, useEffect } from 'react';
import {
  Button,
  ButtonGroup,
  HTMLTable,
  HTMLSelect,
  FormGroup,
  InputGroup,
  Callout,
  Dialog,
  Tag,
  Spinner,
} from '@blueprintjs/core';
import api from '../api/client';

interface Leave {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  approved: boolean;
  staff?: { fullName: string; fileNo: string };
}

interface Staff {
  id: string;
  fullName: string;
  fileNo: string;
}

export default function AnnualLeave() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    staffId: '',
    startDate: '',
    endDate: '',
    reason: '',
    approved: false,
  });

  const fetchData = async () => {
    try {
      const [leavesRes, staffRes] = await Promise.all([
        api.get('/leave?year=2026'),
        api.get('/staff'),
      ]);
      setLeaves(leavesRes.data);
      setStaff(staffRes.data);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ staffId: staff[0]?.id || '', startDate: '', endDate: '', reason: '', approved: false });
    setDialogOpen(true);
  };

  const openEdit = (l: Leave) => {
    setEditId(l.id);
    setForm({
      staffId: l.staffId,
      startDate: l.startDate.split('T')[0],
      endDate: l.endDate.split('T')[0],
      reason: l.reason || '',
      approved: l.approved,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.staffId || !form.startDate || !form.endDate) {
      setError('Staff, start date, and end date are required');
      return;
    }
    try {
      const payload = {
        staffId: form.staffId,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        reason: form.reason || undefined,
        approved: form.approved,
      };

      if (editId) {
        await api.put(`/leave/${editId}`, payload);
        setSuccess('Leave record updated');
      } else {
        await api.post('/leave', payload);
        setSuccess('Leave record created');
      }

      setDialogOpen(false);
      setError('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/leave/${id}`, { approved: true });
      setSuccess('Leave approved');
      setError('');
      fetchData();
    } catch {
      setError('Approve failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this leave record?')) return;
    try {
      await api.delete(`/leave/${id}`);
      setSuccess('Leave record deleted');
      setError('');
      fetchData();
    } catch {
      setError('Delete failed');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h2>Annual Leave Management</h2>
        <p>{leaves.length} leave records for 2026</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }} icon="error">{error}</Callout>}
      {success && <Callout intent="success" style={{ marginBottom: 12 }} icon="tick">{success}</Callout>}

      <Button
        intent="primary"
        icon="add"
        text="Add Leave"
        onClick={openCreate}
        style={{ marginBottom: 16 }}
      />

      <div className="staff-table-container">
        <HTMLTable striped compact style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Staff</th>
              <th>File No</th>
              <th>Start</th>
              <th>End</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l.id}>
                <td>{l.staff?.fullName || '-'}</td>
                <td>{l.staff?.fileNo || '-'}</td>
                <td>{new Date(l.startDate).toLocaleDateString('en-GB')}</td>
                <td>{new Date(l.endDate).toLocaleDateString('en-GB')}</td>
                <td>{l.reason || '-'}</td>
                <td>
                  <Tag intent={l.approved ? 'success' : 'warning'} minimal>
                    {l.approved ? 'Approved' : 'Pending'}
                  </Tag>
                </td>
                <td>
                  <ButtonGroup minimal>
                    <Button small icon="edit" title="Edit" onClick={() => openEdit(l)} />
                    {!l.approved && (
                      <Button small icon="tick" intent="success" title="Approve" onClick={() => handleApprove(l.id)} />
                    )}
                    <Button small icon="trash" intent="danger" title="Delete" onClick={() => handleDelete(l.id)} />
                  </ButtonGroup>
                </td>
              </tr>
            ))}
            {leaves.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>
                  No leave records yet
                </td>
              </tr>
            )}
          </tbody>
        </HTMLTable>
      </div>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editId ? 'Edit Leave' : 'Add Leave'}
        style={{ width: 500 }}
      >
        <div style={{ padding: 20 }}>
          <FormGroup label="Staff Member">
            <HTMLSelect value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} fill>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.fileNo})</option>)}
            </HTMLSelect>
          </FormGroup>
          <FormGroup label="Start Date">
            <InputGroup type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </FormGroup>
          <FormGroup label="End Date">
            <InputGroup type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </FormGroup>
          <FormGroup label="Reason">
            <InputGroup value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g., Annual leave" />
          </FormGroup>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button text="Cancel" onClick={() => setDialogOpen(false)} />
            <Button
              intent="primary"
              icon={editId ? 'floppy-disk' : 'add'}
              text={editId ? 'Update' : 'Save'}
              onClick={handleSave}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
