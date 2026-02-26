import { useState, useEffect } from 'react';
import { Button, HTMLTable, Callout, FormGroup, Tag, Spinner } from '@blueprintjs/core';
import api from '../api/client';

interface Staff {
  id: string;
  fullName: string;
  primarySection: string;
  category: string;
}

const SECTIONS = ['Hematology', 'Chemistry', 'Microbiology', 'Serology', 'Phlebotomy', 'Reception/LIS', 'TB'];

export default function WeeklyAllocation() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [allocation, setAllocation] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/staff');
        setStaff(res.data);
        // Initialize allocation with staff in their primary sections
        const init: Record<string, string[]> = {};
        SECTIONS.forEach((s) => (init[s] = []));
        res.data.forEach((s: Staff) => {
          if (init[s.primarySection]) {
            init[s.primarySection].push(s.fullName);
          }
        });
        setAllocation(init);
      } catch {
        setError('Failed to load staff');
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const moveStaff = (name: string, fromSection: string, toSection: string) => {
    setAllocation((prev) => {
      const updated = { ...prev };
      updated[fromSection] = updated[fromSection].filter((n) => n !== name);
      updated[toSection] = [...(updated[toSection] || []), name];
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      await api.post('/allocations', {
        weekStart: monday.toISOString(),
        weekEnd: friday.toISOString(),
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
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <h2>Weekly Job Allocation</h2>
        <p>Assign staff to sections for the current week</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }}>{error}</Callout>}
      {success && <Callout intent="success" style={{ marginBottom: 12 }}>{success}</Callout>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Button intent="primary" icon="floppy-disk" text="Save Allocation" loading={saving} onClick={handleSave} />
        <Button icon="document" text="Export DOCX" onClick={handleExport} />
      </div>

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
                <td><strong>{section}</strong></td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(allocation[section] || []).map((name) => (
                      <Tag
                        key={name}
                        minimal
                        interactive
                        onRemove={() => {
                          // Move to unassigned or another section
                          setAllocation((prev) => ({
                            ...prev,
                            [section]: prev[section].filter((n) => n !== name),
                          }));
                        }}
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

      <div className="form-section" style={{ marginTop: 16 }}>
        <h4>Available Staff (click to reassign)</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {staff
            .filter((s) => !Object.values(allocation).flat().includes(s.fullName))
            .map((s) => (
              <Tag
                key={s.id}
                intent="primary"
                interactive
                onClick={() => {
                  setAllocation((prev) => ({
                    ...prev,
                    [s.primarySection]: [...(prev[s.primarySection] || []), s.fullName],
                  }));
                }}
              >
                {s.fullName} ({s.primarySection})
              </Tag>
            ))}
        </div>
      </div>
    </div>
  );
}
