import { useState, useEffect } from 'react';
import {
  Button,
  HTMLTable,
  InputGroup,
  FormGroup,
  TextArea,
  Switch,
  Callout,
  Dialog,
  Tag,
  Spinner,
} from '@blueprintjs/core';
import api from '../api/client';

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  notifyAll: boolean;
  notifyIds: string[];
  createdAt: string;
}

interface Staff {
  id: string;
  fullName: string;
}

export default function EventGenerator() {
  const [events, setEvents] = useState<Event[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    notifyAll: true,
    notifyIds: [] as string[],
  });

  const fetchData = async () => {
    try {
      const [eventsRes, staffRes] = await Promise.all([
        api.get('/events'),
        api.get('/staff'),
      ]);
      setEvents(eventsRes.data);
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
      await api.post('/events', {
        ...form,
        date: new Date(form.date).toISOString(),
      });
      setDialogOpen(false);
      setSuccess('Event created and notifications sent (stub)');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create event');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      fetchData();
    } catch {
      setError('Delete failed');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h2>Lab Events</h2>
        <p>Create events and notify staff</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }}>{error}</Callout>}
      {success && <Callout intent="success" style={{ marginBottom: 12 }}>{success}</Callout>}

      <Button
        intent="primary"
        icon="add"
        text="Create Event"
        onClick={() => {
          setForm({ title: '', description: '', date: '', notifyAll: true, notifyIds: [] });
          setDialogOpen(true);
        }}
        style={{ marginBottom: 16 }}
      />

      <div className="staff-table-container">
        <HTMLTable striped compact style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Description</th>
              <th>Notify</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.date).toLocaleDateString('en-GB')}</td>
                <td>{e.title}</td>
                <td>{e.description || '-'}</td>
                <td><Tag minimal>{e.notifyAll ? 'All Staff' : `${e.notifyIds.length} staff`}</Tag></td>
                <td>
                  <Button minimal small icon="trash" intent="danger" onClick={() => handleDelete(e.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      </div>

      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title="Create Event" style={{ width: 500 }}>
        <div style={{ padding: 20 }}>
          <FormGroup label="Title">
            <InputGroup value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
          </FormGroup>
          <FormGroup label="Description">
            <TextArea fill value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Event details..." />
          </FormGroup>
          <FormGroup label="Date">
            <InputGroup type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FormGroup>
          <Switch
            label="Notify all staff"
            checked={form.notifyAll}
            onChange={() => setForm({ ...form, notifyAll: !form.notifyAll })}
          />
          {!form.notifyAll && (
            <FormGroup label="Select staff to notify">
              <div style={{ maxHeight: 200, overflow: 'auto', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {staff.map((s) => (
                  <Tag
                    key={s.id}
                    interactive
                    intent={form.notifyIds.includes(s.id) ? 'primary' : 'none'}
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        notifyIds: f.notifyIds.includes(s.id)
                          ? f.notifyIds.filter((id) => id !== s.id)
                          : [...f.notifyIds, s.id],
                      }));
                    }}
                  >
                    {s.fullName}
                  </Tag>
                ))}
              </div>
            </FormGroup>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button text="Cancel" onClick={() => setDialogOpen(false)} />
            <Button intent="primary" text="Create & Notify" onClick={handleSave} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
