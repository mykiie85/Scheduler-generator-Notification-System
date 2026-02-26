interface StaffWithConstraints {
  id: string;
  fullName: string;
  category: string;
  primarySection: string;
  constraints: Array<{
    maxNights: number;
    offDays: number[];
    preferred: string;
    notes: string | null;
  }>;
  annualLeaves: Array<{
    startDate: Date;
    endDate: Date;
    approved: boolean;
  }>;
}

interface RosterEntry {
  staffId: string;
  staffName: string;
  section: string;
  category: string;
  shifts: Record<string, string>; // day number -> shift type
}

interface RosterData {
  entries: RosterEntry[];
  meta: {
    month: number;
    year: number;
    daysInMonth: number;
    generatedAt: string;
  };
}

export function generateRoster(
  staff: StaffWithConstraints[],
  month: number,
  year: number,
): RosterData {
  const daysInMonth = new Date(year, month, 0).getDate();
  const entries: RosterEntry[] = [];

  // Separate staff by category for shift distribution
  const degreeStaff = staff.filter((s) => s.category === 'DEGREE');
  const diplomaStaff = staff.filter((s) => s.category === 'DIPLOMA');
  const certStaff = staff.filter((s) => s.category === 'CERTIFICATE');
  const attendantStaff = staff.filter((s) => s.category === 'ATTENDANT');

  // All eligible staff for shifts
  const shiftEligible = [...degreeStaff, ...diplomaStaff, ...certStaff];

  for (const member of staff) {
    const constraint = member.constraints[0]; // constraint for this month
    const shifts: Record<string, string> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

      // Check if on annual leave
      const onLeave = member.annualLeaves.some(
        (l) => l.approved && date >= l.startDate && date <= l.endDate,
      );
      if (onLeave) {
        shifts[String(day)] = 'AL';
        continue;
      }

      // Check if this is an off day per constraints
      if (constraint?.offDays?.includes(day)) {
        shifts[String(day)] = 'OFF';
        continue;
      }

      // Attendants are always morning shift (weekdays)
      if (member.category === 'ATTENDANT') {
        shifts[String(day)] = dayOfWeek === 0 || dayOfWeek === 6 ? 'OFF' : 'M';
        continue;
      }

      // Default shift assignment logic
      shifts[String(day)] = assignShift(member, day, dayOfWeek, constraint, shiftEligible);
    }

    entries.push({
      staffId: member.id,
      staffName: member.fullName,
      section: member.primarySection,
      category: member.category,
      shifts,
    });
  }

  // Balance night shifts across eligible staff
  balanceNightShifts(entries, shiftEligible, daysInMonth);

  return {
    entries,
    meta: {
      month,
      year,
      daysInMonth,
      generatedAt: new Date().toISOString(),
    },
  };
}

function assignShift(
  member: StaffWithConstraints,
  day: number,
  dayOfWeek: number,
  constraint: StaffWithConstraints['constraints'][0] | undefined,
  _allStaff: StaffWithConstraints[],
): string {
  // Sundays: reduced staffing
  if (dayOfWeek === 0) {
    // Rotate who works Sundays - use staff index and day for deterministic distribution
    const hash = simpleHash(member.id + day);
    if (hash % 3 === 0) return 'M';
    if (hash % 3 === 1) return 'OFF';
    return 'OFF';
  }

  // Use preferred shift if specified
  if (constraint?.preferred) {
    const pref = constraint.preferred;
    if (pref === 'MORNING') return 'M';
    if (pref === 'EVENING') return 'E';
    if (pref === 'NIGHT') return 'N';
  }

  // Default rotating pattern based on day and staff hash
  const hash = simpleHash(member.id + day);
  const rotation = hash % 5;
  if (rotation < 3) return 'M'; // 60% morning
  if (rotation < 4) return 'E'; // 20% evening
  return 'N'; // 20% night
}

function balanceNightShifts(
  entries: RosterEntry[],
  shiftEligible: StaffWithConstraints[],
  daysInMonth: number,
): void {
  // Count night shifts per person
  const eligibleIds = new Set(shiftEligible.map((s) => s.id));

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day);
    const nightWorkers = entries.filter(
      (e) => eligibleIds.has(e.staffId) && e.shifts[dayStr] === 'N',
    );

    // Ensure at least 2 night workers per day
    if (nightWorkers.length < 2) {
      const available = entries.filter(
        (e) =>
          eligibleIds.has(e.staffId) &&
          e.shifts[dayStr] === 'M' &&
          countShiftType(e.shifts, 'N') < 8,
      );
      const needed = 2 - nightWorkers.length;
      for (let i = 0; i < Math.min(needed, available.length); i++) {
        available[i].shifts[dayStr] = 'N';
      }
    }
  }
}

function countShiftType(shifts: Record<string, string>, type: string): number {
  return Object.values(shifts).filter((s) => s === type).length;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
