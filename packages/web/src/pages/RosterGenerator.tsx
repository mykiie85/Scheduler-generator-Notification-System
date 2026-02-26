import { useState, useEffect, useMemo } from 'react';
import { Button, HTMLSelect, Callout, Spinner, Tag } from '@blueprintjs/core';
import { DataGrid, Column } from 'react-data-grid';
import api from '../api/client';

interface RosterEntry {
  staffId: string;
  staffName: string;
  section: string;
  category: string;
  shifts: Record<string, string>;
}

interface RosterData {
  entries: RosterEntry[];
  meta: { month: number; year: number; daysInMonth: number; generatedAt: string };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHIFT_COLORS: Record<string, string> = {
  M: '#e8f5e9',
  E: '#fff3e0',
  N: '#e3f2fd',
  OFF: '#f5f5f5',
  AL: '#ffebee',
};

export default function RosterGenerator() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [roster, setRoster] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const fetchRoster = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/rosters/${year}/${month}`);
      setRoster(res.data.data as RosterData);
      setStatus(res.data.status);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setRoster(null);
        setStatus('');
      } else {
        setError('Failed to load roster');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoster(); }, [month, year]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/rosters/generate', { month, year });
      setRoster(res.data.data as RosterData);
      setStatus('draft');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/rosters/${year}/${month}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roster-${year}-${String(month).padStart(2, '0')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed');
    }
  };

  const handleCellEdit = (rowIdx: number, colKey: string, value: string) => {
    if (!roster) return;
    const updated = { ...roster };
    const day = colKey.replace('d', '');
    updated.entries[rowIdx].shifts[day] = value;
    setRoster(updated);
  };

  const handleSave = async () => {
    if (!roster) return;
    try {
      await api.put(`/rosters/${year}/${month}`, { data: roster, status: 'final' });
      setStatus('final');
    } catch {
      setError('Save failed');
    }
  };

  const daysInMonth = new Date(year, month, 0).getDate();

  const columns: Column<RosterEntry>[] = useMemo(() => {
    const cols: Column<RosterEntry>[] = [
      { key: 'num', name: '#', width: 40, frozen: true, renderCell: ({ rowIdx }) => rowIdx + 1 },
      { key: 'staffName', name: 'Staff', width: 180, frozen: true },
      { key: 'section', name: 'Section', width: 110 },
    ];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      cols.push({
        key: `d${d}`,
        name: `${d}\n${dayName}`,
        width: 48,
        renderCell: ({ row, rowIdx }) => {
          const shift = row.shifts[String(d)] || '';
          return (
            <div
              style={{
                background: SHIFT_COLORS[shift] || 'transparent',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: 12,
                padding: '2px 0',
                cursor: 'pointer',
                width: '100%',
                height: '100%',
                lineHeight: '30px',
              }}
              onClick={() => {
                const options = ['M', 'E', 'N', 'OFF', 'AL'];
                const idx = options.indexOf(shift);
                const next = options[(idx + 1) % options.length];
                handleCellEdit(rowIdx, `d${d}`, next);
              }}
            >
              {shift}
            </div>
          );
        },
      });
    }
    return cols;
  }, [daysInMonth, roster]);

  return (
    <div>
      <div className="page-header">
        <h2>Duty Roster Generator</h2>
        <p>Generate and edit monthly duty rosters</p>
      </div>

      {error && <Callout intent="danger" style={{ marginBottom: 12 }}>{error}</Callout>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <HTMLSelect value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </HTMLSelect>
        <HTMLSelect value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
        </HTMLSelect>
        <Button
          intent="primary"
          icon="refresh"
          text="Generate"
          loading={generating}
          onClick={handleGenerate}
        />
        {roster && (
          <>
            <Button icon="floppy-disk" text="Save as Final" onClick={handleSave} />
            <Button icon="export" text="Export XLSX" onClick={handleExport} />
            {status && <Tag intent={status === 'final' ? 'success' : 'warning'}>{status}</Tag>}
          </>
        )}
      </div>

      {loading && <Spinner />}

      {roster && roster.entries?.length > 0 && (
        <div className="roster-grid" style={{ height: Math.min(roster.entries.length * 35 + 60, 700) }}>
          <DataGrid
            columns={columns}
            rows={roster.entries}
            style={{ height: '100%' }}
          />
        </div>
      )}

      {!loading && !roster && (
        <Callout intent="none" icon="info-sign">
          No roster for {MONTHS[month - 1]} {year}. Click Generate to create one.
        </Callout>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
        Click on a shift cell to cycle: M (Morning) → E (Evening) → N (Night) → OFF → AL (Annual Leave)
      </div>
    </div>
  );
}
