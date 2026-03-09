import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  HTMLTable,
  InputGroup,
  FormGroup,
  Callout,
  Spinner,
  Tag,
  Popover,
  Checkbox,
  ButtonGroup,
} from '@blueprintjs/core';
import api from '../api/client';

// --- Types ---

interface Staff {
  id: string;
  fullName: string;
  phone: string | null;
  primarySection: string;
}

interface HolidayData {
  mainLabAm: string[];
  mainLabPm: string[];
  emdLabAm: string[];
  emdLabPm: string[];
  bimaLabAm: string[];
}

interface HolidayShift {
  id: string;
  date: string;
  holidayName: string;
  data: HolidayData | null;
}

const EMPTY_DATA: HolidayData = {
  mainLabAm: [],
  mainLabPm: [],
  emdLabAm: [],
  emdLabPm: [],
  bimaLabAm: [],
};

const SLOT_CONFIG: { key: keyof HolidayData; lab: string; shift: string }[] = [
  { key: 'mainLabAm', lab: 'Main Lab', shift: 'AM' },
  { key: 'mainLabPm', lab: 'Main Lab', shift: 'PM' },
  { key: 'emdLabAm', lab: 'EMD Lab', shift: 'AM' },
  { key: 'emdLabPm', lab: 'EMD Lab', shift: 'PM' },
  { key: 'bimaLabAm', lab: 'BIMA Lab', shift: 'AM' },
];

// --- Multi-select component ---

function StaffMultiSelect({
  label,
  staffList,
  selected,
  onChange,
}: {
  label: string;
  staffList: Staff[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  return (
    <FormGroup label={label} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6, minHeight: 28 }}>
        {selected.map((id) => {
          const s = staffList.find((st) => st.id === id);
          return (
            <Tag
              key={id}
              intent="primary"
              onRemove={() => toggle(id)}
              minimal
            >
              {s?.fullName ?? id}
            </Tag>
          );
        })}
        {selected.length === 0 && (
          <span style={{ color: '#999', fontSize: 13, lineHeight: '28px' }}>None selected</span>
        )}
      </div>
      <Popover
        content={
          <div style={{ padding: 10, maxHeight: 250, overflowY: 'auto', minWidth: 220 }}>
            {staffList.map((s) => (
              <Checkbox
                key={s.id}
                label={s.fullName}
                checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
                style={{ marginBottom: 4 }}
              />
            ))}
          </div>
        }
        placement="bottom-start"
        minimal
      >
        <Button small text="Select staff..." icon="person" />
      </Popover>
    </FormGroup>
  );
}

// --- Main component ---

export default function HolidayScheduler() {
  const [shifts, setShifts] = useState<HolidayShift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [data, setData] = useState<HolidayData>({ ...EMPTY_DATA });

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setEditId(null);
    setDate('');
    setHolidayName('');
    setData({ ...EMPTY_DATA });
  };

  const loadShift = (shift: HolidayShift) => {
    setEditId(shift.id);
    setDate(shift.date.split('T')[0]);
    setHolidayName(shift.holidayName);
    setData(shift.data ? { ...EMPTY_DATA, ...shift.data } : { ...EMPTY_DATA });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!date || !holidayName) {
      setError('Date and holiday name are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: new Date(date).toISOString(),
        holidayName,
        data,
      };
      if (editId) {
        await api.put(`/holidays/${editId}`, payload);
        setSuccess('Holiday shift updated');
      } else {
        await api.post('/holidays', payload);
        setSuccess('Holiday shift created');
      }
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday shift?')) return;
    try {
      await api.delete(`/holidays/${id}`);
      if (editId === id) resetForm();
      setSuccess('Holiday shift deleted');
      fetchData();
    } catch {
      setError('Delete failed');
    }
  };

  const handleExport = async (id: string) => {
    try {
      const res = await api.get(`/holidays/${id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `holiday-shift.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Export failed');
    }
  };

  const handleNotify = async (id?: string) => {
    const targetId = id || editId;
    if (!targetId) {
      setError('Save the holiday first before notifying');
      return;
    }
    setNotifying(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/holidays/${targetId}/notify`);
      setSuccess(`Staff notified successfully (${res.data.count} messages sent)`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || (err instanceof Error ? err.message : 'Unknown error');
      setError(`Failed to notify staff: ${msg}`);
    } finally {
      setNotifying(false);
    }
  };

  const updateSlot = (key: keyof HolidayData, ids: string[]) => {
    setData((prev) => ({ ...prev, [key]: ids }));
  };

  const resolveNames = (ids: string[]) =>
    ids.map((id) => staff.find((s) => s.id === id)?.fullName ?? '?').join(', ');

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h2>Holiday Shift Scheduler</h2>
        <p>Assign staff to public holiday duty across labs</p>
      </div>

      {error && (
        <Callout intent="danger" style={{ marginBottom: 12 }} icon="error">
          {error}
        </Callout>
      )}
      {success && (
        <Callout intent="success" style={{ marginBottom: 12 }} icon="tick">
          {success}
        </Callout>
      )}

      {/* Form */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
          border: '1px solid #dce4ef',
        }}
      >
        <h3 style={{ margin: '0 0 16px', color: '#0f3c68' }}>
          {editId ? 'Edit Holiday Shift' : 'New Holiday Shift'}
        </h3>

        <div className="action-bar" style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <FormGroup label="Date" style={{ flex: 1, minWidth: 180 }}>
            <InputGroup
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Holiday Name" style={{ flex: 2, minWidth: 220 }}>
            <InputGroup
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              placeholder="e.g., Union Day"
            />
          </FormGroup>
        </div>

        {/* AM Shift */}
        <h4 style={{ color: '#1968b3', marginBottom: 8, borderBottom: '1px solid #dce4ef', paddingBottom: 4 }}>
          AM Shift
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StaffMultiSelect label="Main Lab" staffList={staff} selected={data.mainLabAm} onChange={(ids) => updateSlot('mainLabAm', ids)} />
          <StaffMultiSelect label="EMD Lab" staffList={staff} selected={data.emdLabAm} onChange={(ids) => updateSlot('emdLabAm', ids)} />
          <StaffMultiSelect label="BIMA Lab" staffList={staff} selected={data.bimaLabAm} onChange={(ids) => updateSlot('bimaLabAm', ids)} />
        </div>

        {/* PM Shift */}
        <h4 style={{ color: '#1968b3', marginBottom: 8, borderBottom: '1px solid #dce4ef', paddingBottom: 4 }}>
          PM Shift
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          <StaffMultiSelect label="Main Lab" staffList={staff} selected={data.mainLabPm} onChange={(ids) => updateSlot('mainLabPm', ids)} />
          <StaffMultiSelect label="EMD Lab" staffList={staff} selected={data.emdLabPm} onChange={(ids) => updateSlot('emdLabPm', ids)} />
        </div>

        {/* Actions */}
        <div className="action-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            intent="primary"
            icon={editId ? 'floppy-disk' : 'add'}
            text={editId ? 'Update' : 'Save'}
            onClick={handleSave}
            loading={saving}
          />
          {editId && (
            <>
              <Button
                icon="document"
                text="Export DOCX"
                onClick={() => handleExport(editId)}
              />
              <Button
                intent="success"
                icon="notifications"
                text="Notify Staff"
                loading={notifying}
                onClick={() => handleNotify()}
              />
              <Button
                minimal
                text="Cancel Edit"
                onClick={resetForm}
              />
            </>
          )}
        </div>
      </div>

      {/* Saved holidays table */}
      <div className="staff-table-container">
        <HTMLTable striped compact style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Holiday</th>
              <th>Main Lab AM</th>
              <th>Main Lab PM</th>
              <th>EMD Lab AM</th>
              <th>EMD Lab PM</th>
              <th>BIMA Lab AM</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => {
              const d = s.data ?? EMPTY_DATA;
              return (
                <tr
                  key={s.id}
                  onClick={() => loadShift(s)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{new Date(s.date).toLocaleDateString('en-GB')}</td>
                  <td>{s.holidayName}</td>
                  <td>{resolveNames(d.mainLabAm)}</td>
                  <td>{resolveNames(d.mainLabPm)}</td>
                  <td>{resolveNames(d.emdLabAm)}</td>
                  <td>{resolveNames(d.emdLabPm)}</td>
                  <td>{resolveNames(d.bimaLabAm)}</td>
                  <td>
                    <ButtonGroup minimal>
                      <Button
                        small
                        icon="edit"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); loadShift(s); }}
                      />
                      <Button
                        small
                        icon="notifications"
                        intent="success"
                        title="Notify Staff"
                        onClick={(e) => { e.stopPropagation(); handleNotify(s.id); }}
                      />
                      <Button
                        small
                        icon="document"
                        title="Export DOCX"
                        onClick={(e) => { e.stopPropagation(); handleExport(s.id); }}
                      />
                      <Button
                        small
                        icon="trash"
                        intent="danger"
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                      />
                    </ButtonGroup>
                  </td>
                </tr>
              );
            })}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#888' }}>
                  No holiday shifts scheduled
                </td>
              </tr>
            )}
          </tbody>
        </HTMLTable>
      </div>
    </div>
  );
}
