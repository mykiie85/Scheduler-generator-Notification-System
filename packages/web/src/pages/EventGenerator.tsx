import { useState, useEffect } from 'react';
import {
  Button,
  ButtonGroup,
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
  phone: string | null;
}

export default function EventGenerator() {
  const [events, setEvents] = useState<Event[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
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

  const openCreate = () => {
    setEditId(null);
    setForm({ title: '', description: '', date: '', notifyAll: true, notifyIds: [] });
    setDialogOpen(true);
  };

  const openEdit = (e: Event) => {
    setEditId(e.id);
    setForm({
      title: e.title,
      description: e.description || '',
      date: e.date.split('T')[0],
      notifyAll: e.notifyAll,
      notifyIds: e.notifyIds || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.date) {
      setError('Title and date are required');
      return;
    }
    try {
      const payload = {
        ...form,
        date: new Date(form.date).toISOString(),
      };

      if (editId) {
        await api.put(`/events/${editId}`, payload);
        setSuccess('Event updated');
      } else {
        await api.post('/events', payload);
        setSuccess('Event created');
      }

      setDialogOpen(false);
      setError('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save event');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      setSuccess('Event deleted');
      setError('');
      fetchData();
    } catch {
      setError('Delete failed');
    }
  };

  const handleNotify = async (event: Event) => {
    const webhookUrl = 'https://n8n-p5jx.onrender.com/webhook-test/af0ee9b9-2a36-4bb2-aed6-d0483f466e62';

    const targetStaff = event.notifyAll
      ? staff
      : staff.filter((s) => event.notifyIds.includes(s.id));

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: event.title,
          eventDescription: event.description,
          eventDate: event.date,
          staff: targetStaff.map((s) => ({
            fullName: s.fullName,
            phone: s.phone,
          })),
        }),
      });
      setSuccess(`Notifications sent for "${event.title}"`);
      setError('');
    } catch {
      setError('Failed to send notifications');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h2>Lab Events</h2>
        <p>Create events and notify staff</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }} icon="error">{error}</Callout>}
      {success && <Callout intent="success" style={{ marginBottom: 12 }} icon="tick">{success}</Callout>}

      <Button
        intent="primary"
        icon="add"
        text="Create Event"
        onClick={openCreate}
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
                  <ButtonGroup minimal>
                    <Button small icon="edit" title="Edit" onClick={() => openEdit(e)} />
                    <Button small icon="notifications" intent="success" title="Notify Staff" onClick={() => handleNotify(e)} />
                    <Button small icon="trash" intent="danger" title="Delete" onClick={() => handleDelete(e.id)} />
                  </ButtonGroup>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>
                  No events yet
                </td>
              </tr>
            )}
          </tbody>
        </HTMLTable>
      </div>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editId ? 'Edit Event' : 'Create Event'}
        style={{ width: 500 }}
      >
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
            <Button
              intent="primary"
              icon={editId ? 'floppy-disk' : 'add'}
              text={editId ? 'Update' : 'Create'}
              onClick={handleSave}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
