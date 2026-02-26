import { useState, useEffect } from 'react';
import {
  Button,
  HTMLTable,
  InputGroup,
  FormGroup,
  TextArea,
  Callout,
  Dialog,
  Tag,
  Spinner,
} from '@blueprintjs/core';
import api from '../api/client';

interface Announcement {
  id: string;
  title: string;
  content: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', content: '', scheduledAt: '' });

  const fetchData = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch {
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    try {
      await api.post('/announcements', {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      });
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      fetchData();
    } catch {
      setError('Delete failed');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h2>Announcements</h2>
        <p>Create and schedule lab announcements</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }}>{error}</Callout>}

      <Button
        intent="primary"
        icon="add"
        text="New Announcement"
        onClick={() => {
          setForm({ title: '', content: '', scheduledAt: '' });
          setDialogOpen(true);
        }}
        style={{ marginBottom: 16 }}
      />

      <div className="staff-table-container">
        <HTMLTable striped compact style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Created</th>
              <th>Title</th>
              <th>Content</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleDateString('en-GB')}</td>
                <td>{a.title}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.content}
                </td>
                <td>
                  {a.sentAt ? (
                    <Tag intent="success" minimal>Sent</Tag>
                  ) : a.scheduledAt ? (
                    <Tag intent="warning" minimal>Scheduled</Tag>
                  ) : (
                    <Tag minimal>Draft</Tag>
                  )}
                </td>
                <td>
                  <Button minimal small icon="trash" intent="danger" onClick={() => handleDelete(a.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      </div>

      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title="New Announcement" style={{ width: 500 }}>
        <div style={{ padding: 20 }}>
          <FormGroup label="Title">
            <InputGroup value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" />
          </FormGroup>
          <FormGroup label="Content">
            <TextArea fill rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Announcement content..." />
          </FormGroup>
          <FormGroup label="Schedule (optional)">
            <InputGroup type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </FormGroup>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button text="Cancel" onClick={() => setDialogOpen(false)} />
            <Button intent="primary" text="Create" onClick={handleSave} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
