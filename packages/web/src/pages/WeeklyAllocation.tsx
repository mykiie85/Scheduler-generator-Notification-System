import { useState, useEffect, useMemo, DragEvent } from 'react';
import { Button, HTMLTable, Callout, Tag, Spinner } from '@blueprintjs/core';
import api from '../api/client';

const POOL_ID = '__pool__';

interface Staff {
  id: string;
  fullName: string;
  primarySection: string;
  category: string;
}

const SECTIONS = [
  'Hematology',
  'Chemistry',
  'Microbiology',
  'Serology',
  'Phlebotomy',
  'Reception/LIS',
  'TB & Leprosy',
  'Emergency Lab',
  'BIMA Lab',
  'Parasitology',
  'Store',
  'Management',
];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function WeeklyAllocation() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [allocation, setAllocation] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Date range state - default to current week Mon-Fri (lazy init)
  const [weekStart, setWeekStart] = useState(() => formatDate(getMonday(new Date())));
  const [weekEnd, setWeekEnd] = useState(() => {
    const mon = getMonday(new Date());
    const fri = new Date(mon);
    fri.setDate(mon.getDate() + 4);
    return formatDate(fri);
  });

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/staff');
        setStaff(res.data);
        // Initialize all sections as empty - staff start in the pool
        const init: Record<string, string[]> = {};
        SECTIONS.forEach((s) => (init[s] = []));
        setAllocation(init);
      } catch {
        setError('Failed to load staff');
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  // Drag-and-drop handlers
  const handleDragStart = (e: DragEvent, name: string, fromSection: string) => {
    e.dataTransfer.setData('staffName', name);
    e.dataTransfer.setData('fromSection', fromSection);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, target: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(target);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = (e: DragEvent, toSection: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    const name = e.dataTransfer.getData('staffName');
    const fromSection = e.dataTransfer.getData('fromSection');

    if (!name || fromSection === toSection) return;

    setAllocation((prev) => {
      const updated = { ...prev };
      // Remove from source section (if not coming from pool)
      if (fromSection !== POOL_ID && updated[fromSection]) {
        updated[fromSection] = updated[fromSection].filter((n) => n !== name);
      }
      // Add to target section (if not going back to pool), prevent duplicates
      if (toSection !== POOL_ID) {
        if (!updated[toSection]?.includes(name)) {
          updated[toSection] = [...(updated[toSection] || []), name];
        }
      }
      return updated;
    });
  };

  const removeFromSection = (name: string, section: string) => {
    setAllocation((prev) => ({
      ...prev,
      [section]: prev[section].filter((n) => n !== name),
    }));
  };

  const handleSave = async () => {
    if (weekStart > weekEnd) {
      setError('End date must be after start date');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/allocations', {
        weekStart: weekStart + 'T00:00:00Z',
        weekEnd: weekEnd + 'T23:59:59Z',
        data: allocation,
      });
      setSuccess('Allocation saved');
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/allocations');
      if (res.data.length === 0) {
        setError('Save an allocation first');
        return;
      }
      const latest = res.data[0];
      const exportRes = await api.get(`/allocations/${latest.id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(exportRes.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'weekly-allocation.docx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch {
      setError('Export failed');
    }
  };

  const handleNotify = async () => {
    setNotifying(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        weekStart,
        weekEnd,
        allocations: { ...allocation },
      };
      const webhookUrl = import.meta.env.VITE_N8N_NOTIFY_WEBHOOK_URL;
      if (!webhookUrl) {
        setError('Notify webhook URL not configured');
        return;
      }
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }
      setSuccess('Staff notified successfully');
    } catch (err) {
      setError(`Failed to notify staff: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setNotifying(false);
    }
  };

  const assignedNames = useMemo(() => Object.values(allocation).flat(), [allocation]);
  const availableStaff = useMemo(
    () => staff.filter((s) => !assignedNames.includes(s.fullName)),
    [staff, assignedNames],
  );

  const dropHighlight = (target: string) =>
    dragOverTarget === target
      ? { backgroundColor: '#d4e6f9', outline: '2px dashed #1968b3', outlineOffset: -2 }
      : {};

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h2>Weekly Job Allocation</h2>
        <p>Assign staff to sections for the selected week</p>
      </div>

      {error && (
        <Callout intent="danger" style={{ marginBottom: 12 }}>
          {error}
        </Callout>
      )}
      {success && (
        <Callout intent="success" style={{ marginBottom: 12 }}>
          {success}
        </Callout>
      )}

      {/* Date Range Picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ fontWeight: 600 }}>Week:</label>
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: 3, border: '1px solid #ccc' }}
        />
        <span>to</span>
        <input
          type="date"
          value={weekEnd}
          onChange={(e) => setWeekEnd(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: 3, border: '1px solid #ccc' }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Button intent="primary" icon="floppy-disk" text="Save Allocation" loading={saving} onClick={handleSave} />
        <Button icon="document" text="Export DOCX" onClick={handleExport} />
        <Button
          intent="success"
          icon="send-message"
          text="Notify Staff"
          loading={notifying}
          onClick={handleNotify}
        />
      </div>

      {/* Allocation Table */}
      <div className="form-section">
        <HTMLTable striped style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 160 }}>Section</th>
              <th>Assigned Staff</th>
              <th style={{ width: 60 }}>Count</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((section) => (
              <tr key={section}>
                <td>
                  <strong>{section}</strong>
                </td>
                <td
                  onDragOver={(e) => handleDragOver(e, section)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, section)}
                  style={{
                    minHeight: 36,
                    padding: '6px 8px',
                    transition: 'background-color 0.15s',
                    ...dropHighlight(section),
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(allocation[section] || []).map((name) => (
                      <Tag
                        key={name}
                        minimal
                        interactive
                        draggable
                        onDragStart={(e) => handleDragStart(e as unknown as DragEvent, name, section)}
                        onRemove={() => removeFromSection(name, section)}
                        style={{ cursor: 'grab' }}
                      >
                        {name}
                      </Tag>
                    ))}
                  </div>
                </td>
                <td>{(allocation[section] || []).length}</td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      </div>

      {/* Available Staff Pool */}
      <div
        className="form-section"
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 4,
          transition: 'background-color 0.15s',
          ...dropHighlight(POOL_ID),
        }}
        onDragOver={(e) => handleDragOver(e, POOL_ID)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, POOL_ID)}
      >
        <h4>Available Staff (drag to assign)</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {availableStaff.map((s) => (
            <Tag
              key={s.id}
              intent="primary"
              interactive
              draggable
              onDragStart={(e) => handleDragStart(e as unknown as DragEvent, s.fullName, POOL_ID)}
              style={{ cursor: 'grab' }}
            >
              {s.fullName}
            </Tag>
          ))}
          {availableStaff.length === 0 && (
            <span style={{ color: '#888', fontStyle: 'italic' }}>All staff assigned</span>
          )}
        </div>
      </div>
    </div>
  );
}
