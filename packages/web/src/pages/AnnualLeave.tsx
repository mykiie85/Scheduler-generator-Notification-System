import { useState, useEffect } from 'react';
import {
  Button,
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

  const handleSave = async () => {
    try {
      await api.post('/leave', {
        staffId: form.staffId,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        reason: form.reason || undefined,
        approved: form.approved,
      });
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/leave/${id}`, { approved: true });
      fetchData();
    } catch {
      setError('Approve failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this leave record?')) return;
    try {
      await api.delete(`/leave/${id}`);
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

      {error && <Callout intent="danger" style={{ marginBottom: 12 }}>{error}</Callout>}

      <Button
        intent="primary"
        icon="add"
        text="Add Leave"
        onClick={() => {
          setForm({ staffId: staff[0]?.id || '', startDate: '', endDate: '', reason: '', approved: false });
          setDialogOpen(true);
        }}
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
                  {!l.approved && (
                    <Button minimal small icon="tick" intent="success" onClick={() => handleApprove(l.id)} />
                  )}
                  <Button minimal small icon="trash" intent="danger" onClick={() => handleDelete(l.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      </div>

      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title="Add Leave" style={{ width: 500 }}>
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
            <Button intent="primary" text="Save" onClick={handleSave} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
