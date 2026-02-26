import { useState, useEffect } from 'react';
import {
  Button,
  HTMLTable,
  InputGroup,
  FormGroup,
  HTMLSelect,
  Callout,
  Dialog,
  Switch,
  Spinner,
} from '@blueprintjs/core';
import api from '../api/client';

interface HolidayShift {
  id: string;
  date: string;
  holidayName: string;
  amStaffId: string | null;
  pmStaffId: string | null;
  nightPull: boolean;
  amStaff?: { fullName: string } | null;
}

interface Staff {
  id: string;
  fullName: string;
}

export default function HolidayScheduler() {
  const [shifts, setShifts] = useState<HolidayShift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: '',
    holidayName: '',
    amStaffId: '',
    pmStaffId: '',
    nightPull: true,
  });

  const fetchData = async () => {
    try {
      const [shiftsRes, staffRes] = await Promise.all([
        api.get('/holidays?year=2026'),
        api.get('/staff'),
      ]);
      setShifts(shiftsRes.data);
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
      await api.post('/holidays', {
        ...form,
        date: new Date(form.date).toISOString(),
        amStaffId: form.amStaffId || undefined,
        pmStaffId: form.pmStaffId || undefined,
      });
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday shift?')) return;
    try {
      await api.delete(`/holidays/${id}`);
      fetchData();
    } catch {
      setError('Delete failed');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h2>Holiday Shift Scheduler</h2>
        <p>Manage public holiday duty assignments</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }}>{error}</Callout>}

      <Button
        intent="primary"
        icon="add"
        text="Add Holiday Shift"
        onClick={() => {
          setForm({ date: '', holidayName: '', amStaffId: '', pmStaffId: '', nightPull: true });
          setDialogOpen(true);
        }}
        style={{ marginBottom: 16 }}
      />

      <div className="staff-table-container">
        <HTMLTable striped compact style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Holiday</th>
              <th>AM Staff</th>
              <th>PM Staff</th>
              <th>Night Pull</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.date).toLocaleDateString('en-GB')}</td>
                <td>{s.holidayName}</td>
                <td>{s.amStaff?.fullName || '-'}</td>
                <td>{staff.find((st) => st.id === s.pmStaffId)?.fullName || '-'}</td>
                <td>{s.nightPull ? 'Yes' : 'No'}</td>
                <td>
                  <Button minimal small icon="trash" intent="danger" onClick={() => handleDelete(s.id)} />
                </td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No holiday shifts scheduled</td></tr>
            )}
          </tbody>
        </HTMLTable>
      </div>

      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title="Add Holiday Shift" style={{ width: 500 }}>
        <div style={{ padding: 20 }}>
          <FormGroup label="Date">
            <InputGroup type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FormGroup>
          <FormGroup label="Holiday Name">
            <InputGroup value={form.holidayName} onChange={(e) => setForm({ ...form, holidayName: e.target.value })} placeholder="e.g., Union Day" />
          </FormGroup>
          <FormGroup label="AM Staff">
            <HTMLSelect value={form.amStaffId} onChange={(e) => setForm({ ...form, amStaffId: e.target.value })}>
              <option value="">-- Select --</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </HTMLSelect>
          </FormGroup>
          <FormGroup label="PM Staff">
            <HTMLSelect value={form.pmStaffId} onChange={(e) => setForm({ ...form, pmStaffId: e.target.value })}>
              <option value="">-- Select --</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </HTMLSelect>
          </FormGroup>
          <Switch
            label="Auto night-shift pull from roster"
            checked={form.nightPull}
            onChange={() => setForm({ ...form, nightPull: !form.nightPull })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button text="Cancel" onClick={() => setDialogOpen(false)} />
            <Button intent="primary" text="Save" onClick={handleSave} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
