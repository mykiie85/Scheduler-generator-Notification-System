import { useState, useEffect } from 'react';
import {
  Button,
  ButtonGroup,
  HTMLTable,
  InputGroup,
  FormGroup,
  TextArea,
  Callout,
  Dialog,
  Tag,
  Spinner,
  RadioGroup,
  Radio,
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

interface Staff {
  id: string;
  fullName: string;
  phone: string | null;
}

type NotifyMode = 'now' | 'schedule';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', scheduledAt: '' });
  const [notifyMode, setNotifyMode] = useState<NotifyMode>('now');

  const fetchData = async () => {
    try {
      const [annRes, staffRes] = await Promise.all([
        api.get('/announcements'),
        api.get('/staff'),
      ]);
      setAnnouncements(annRes.data);
      setStaff(staffRes.data);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const sendWebhook = async (announcement: { title: string; content: string; scheduledAt?: string }) => {
    const webhookUrl = import.meta.env.VITE_N8N_ANNOUNCEMENT_WEBHOOK_URL;
    if (!webhookUrl) {
      setError('Announcement webhook URL not configured');
      return false;
    }
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'announcement',
          title: announcement.title,
          content: announcement.content,
          scheduledAt: announcement.scheduledAt || null,
          staff: staff.map((s) => ({
            fullName: s.fullName,
            phone: s.phone,
          })),
        }),
      });
      return true;
    } catch {
      setError('Failed to send notification');
      return false;
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ title: '', content: '', scheduledAt: '' });
    setNotifyMode('now');
    setDialogOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditId(a.id);
    setForm({
      title: a.title,
      content: a.content,
      scheduledAt: a.scheduledAt ? a.scheduledAt.slice(0, 16) : '',
    });
    setNotifyMode(a.scheduledAt ? 'schedule' : 'now');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      setError('Title and content are required');
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        content: form.content,
      };

      if (notifyMode === 'schedule' && form.scheduledAt) {
        payload.scheduledAt = new Date(form.scheduledAt).toISOString();
      }

      if (editId) {
        await api.put(`/announcements/${editId}`, payload);
        setSuccess('Announcement updated');
      } else {
        await api.post('/announcements', payload);

        if (notifyMode === 'now') {
          const sent = await sendWebhook({ title: form.title, content: form.content });
          setSuccess(sent ? 'Announcement created and notification sent' : 'Announcement created but notification failed');
        } else {
          setSuccess('Announcement created and scheduled for later');
        }
      }

      setDialogOpen(false);
      setError('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save announcement');
    }
  };

  const handleNotifyNow = async (a: Announcement) => {
    setError('');
    const sent = await sendWebhook({ title: a.title, content: a.content });
    if (sent) {
      setSuccess(`Notification sent for "${a.title}"`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      setSuccess('Announcement deleted');
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
        <h2>Announcements</h2>
        <p>Create and schedule lab announcements</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }} icon="error">{error}</Callout>}
      {success && <Callout intent="success" style={{ marginBottom: 12 }} icon="tick">{success}</Callout>}

      <Button
        intent="primary"
        icon="add"
        text="New Announcement"
        onClick={openCreate}
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
                    <Tag intent="warning" minimal>
                      Scheduled {new Date(a.scheduledAt).toLocaleDateString('en-GB')}
                    </Tag>
                  ) : (
                    <Tag minimal>Draft</Tag>
                  )}
                </td>
                <td>
                  <ButtonGroup minimal>
                    <Button
                      small
                      icon="edit"
                      title="Edit"
                      onClick={() => openEdit(a)}
                    />
                    <Button
                      small
                      icon="notifications"
                      intent="success"
                      title="Notify Now"
                      onClick={() => handleNotifyNow(a)}
                    />
                    <Button
                      small
                      icon="trash"
                      intent="danger"
                      title="Delete"
                      onClick={() => handleDelete(a.id)}
                    />
                  </ButtonGroup>
                </td>
              </tr>
            ))}
            {announcements.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>
                  No announcements yet
                </td>
              </tr>
            )}
          </tbody>
        </HTMLTable>
      </div>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editId ? 'Edit Announcement' : 'New Announcement'}
        style={{ width: 500 }}
      >
        <div style={{ padding: 20 }}>
          <FormGroup label="Title">
            <InputGroup
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Announcement title"
            />
          </FormGroup>
          <FormGroup label="Content">
            <TextArea
              fill
              rows={5}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Announcement content..."
            />
          </FormGroup>

          {!editId && (
            <FormGroup label="Notification">
              <RadioGroup
                selectedValue={notifyMode}
                onChange={(e) => setNotifyMode(e.currentTarget.value as NotifyMode)}
                inline
              >
                <Radio label="Send Now" value="now" />
                <Radio label="Schedule for Later" value="schedule" />
              </RadioGroup>
            </FormGroup>
          )}

          {(editId || notifyMode === 'schedule') && (
            <FormGroup label="Scheduled Date & Time">
              <InputGroup
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </FormGroup>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button text="Cancel" onClick={() => setDialogOpen(false)} />
            <Button
              intent="primary"
              icon={editId ? 'floppy-disk' : notifyMode === 'now' ? 'notifications' : 'time'}
              text={editId ? 'Update' : notifyMode === 'now' ? 'Create & Send Now' : 'Create & Schedule'}
              onClick={handleSave}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
