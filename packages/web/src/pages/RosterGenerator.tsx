import { useState, useEffect, useMemo } from 'react';
import { Button, HTMLSelect, Callout, Spinner, Tag } from '@blueprintjs/core';
import DataGrid from 'react-data-grid';
import type { Column } from 'react-data-grid';
import api from '../api/client';

// ─── Types (transposed: days as rows, staff as columns) ───

interface StaffInfo {
  shortCode: string;
  fullName: string;
}

interface DayRow {
  date: number;
  dayName: string;
  shifts: Record<string, string>; // shortCode -> shift code
}

interface RosterData {
  staffList: StaffInfo[];
  days: DayRow[];
  meta: { month: number; year: number; daysInMonth: number; generatedAt: string };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getShiftColor(shift: string): string {
  if (shift.includes('EMD')) return '#ffff00'; // Yellow for EMD shifts (matches hospital format)
  if (shift === 'A' || shift === 'U' || shift === 'L' || shift === 'E' || shift === 'V') return '#ffebee';
  return 'transparent';
}

const SHIFT_CYCLE = ['OH', 'PM', 'N', 'SD', 'DO', 'OH+EMD', 'PM+EMD', 'N+EMD', 'OH+BIMA', 'OH+PM', 'A'];

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

  const handleCellEdit = (dayIdx: number, shortCode: string, value: string) => {
    if (!roster) return;
    const updated = structuredClone(roster);
    updated.days[dayIdx].shifts[shortCode] = value;
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

  // Build columns: DATE (frozen), DAY (frozen), then one column per staff shortcode
  const columns: Column<DayRow>[] = useMemo(() => {
    if (!roster) return [];

    const cols: Column<DayRow>[] = [
      {
        key: 'date',
        name: 'DATE',
        width: 32,
        frozen: true,
        renderCell: ({ row }) => (
          <div style={{
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 9,
            width: '100%',
            lineHeight: '22px',
            background: row.dayName === 'Sat' || row.dayName === 'Sun' ? '#eef2f7' : 'transparent',
          }}>
            {row.date}
          </div>
        ),
      },
      {
        key: 'dayName',
        name: 'DAY',
        width: 32,
        frozen: true,
        renderCell: ({ row }) => (
          <div style={{
            textAlign: 'center',
            fontWeight: 600,
            fontSize: 9,
            width: '100%',
            lineHeight: '22px',
            background: row.dayName === 'Sat' || row.dayName === 'Sun' ? '#eef2f7' : 'transparent',
            color: row.dayName === 'Sun' ? '#d32f2f' : row.dayName === 'Sat' ? '#1565c0' : '#333',
          }}>
            {row.dayName}
          </div>
        ),
      },
    ];

    for (const staff of roster.staffList) {
      cols.push({
        key: staff.shortCode,
        name: staff.shortCode,
        width: Math.max(staff.shortCode.length * 6 + 4, 38),
        renderHeaderCell: () => (
          <div title={staff.fullName} style={{
            textAlign: 'center',
            fontSize: 8,
            fontWeight: 700,
            cursor: 'default',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {staff.shortCode}
          </div>
        ),
        renderCell: ({ row, rowIdx }) => {
          const shift = row.shifts[staff.shortCode] || '';
          return (
            <div
              style={{
                background: getShiftColor(shift),
                textAlign: 'center',
                fontWeight: 600,
                fontSize: shift.length > 4 ? 7 : 8,
                cursor: 'pointer',
                width: '100%',
                height: '100%',
                lineHeight: '22px',
                whiteSpace: 'nowrap',
              }}
              title={`${staff.fullName} - ${shift}`}
              onClick={() => {
                const idx = SHIFT_CYCLE.indexOf(shift);
                const next = SHIFT_CYCLE[(idx + 1) % SHIFT_CYCLE.length];
                handleCellEdit(rowIdx, staff.shortCode, next);
              }}
            >
              {shift}
            </div>
          );
        },
      });
    }

    return cols;
  }, [roster]);

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

      {roster && roster.days?.length > 0 && (
        <div className="roster-grid" style={{ height: Math.min(roster.days.length * 24 + 40, 800) }}>
          <DataGrid
            columns={columns}
            rows={roster.days}
            rowHeight={24}
            headerRowHeight={26}
            style={{ height: '100%', fontSize: 9 }}
          />
        </div>
      )}

      {!loading && !roster && (
        <Callout intent="none" icon="info-sign">
          No roster for {MONTHS[month - 1]} {year}. Click Generate to create one.
        </Callout>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: '#888', lineHeight: 1.6 }}>
        Click on a shift cell to cycle: OH → PM → N → SD → DO → OH+EMD → PM+EMD → N+EMD → OH+BIMA → OH+PM → A
      </div>
    </div>
  );
}
