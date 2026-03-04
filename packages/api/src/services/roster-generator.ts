// ─── Staff Preference Maps (hardcoded – rarely change) ───

const OH_ONLY = ['NJAM', 'EKI', 'KIS', 'LOV', 'CATH', 'JOHA', 'KHAD', 'CELI', 'TEKEL', 'KATU', 'MAY', 'BERTHA', 'ASMA'];
const EMD_PREDOMINANT = ['MIK', 'SANG', 'FRANK', 'JISKAKA', 'YSUPH'];
const PM_PREDOMINANT = ['DOREEN', 'HAPPY', 'VALENT'];
const NIGHT_PREDOMINANT = ['GOD', 'JOSEPH', 'DATUS'];
const NIGHT_EMD = ['MIK', 'SANG'];
const BIMA_PREDOMINANT = ['NEEM', 'JENISTER'];
const WEEKEND_SAT_ONLY = ['EKI', 'KIS', 'LOV', 'CATH', 'KHAD', 'CELI', 'TEKEL', 'BERTHA', 'AGRIPIN'];
const WEEKEND_SUN_ONLY = ['NEEM', 'JISKAKA', 'NJAM', 'JOHA', 'KATU'];
const OH_WEEKDAY_PM_SHUFFLE_WEEKEND = ['OMAR', 'AGRIPIN'];
const OH_WEEKDAY_PM_SUNDAY = ['NYAKUNGA'];

// ─── Types ───

interface StaffInput {
  id: string;
  shortCode: string;
  fullName: string;
  category: string;
  primarySection: string;
  annualLeaves: Array<{
    startDate: Date;
    endDate: Date;
    approved: boolean;
  }>;
}

interface DayRow {
  date: number;
  dayName: string;
  shifts: Record<string, string>; // shortCode -> shift code
}

interface RosterData {
  staffList: Array<{ shortCode: string; fullName: string }>;
  days: DayRow[];
  meta: {
    month: number;
    year: number;
    daysInMonth: number;
    generatedAt: string;
  };
}

// ─── Main Generator ───

export function generateRoster(staff: StaffInput[], month: number, year: number): RosterData {
  const daysInMonth = new Date(year, month, 0).getDate();
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const staffList = staff.map((s) => ({ shortCode: s.shortCode, fullName: s.fullName }));
  const staffByCode = new Map(staff.map((s) => [s.shortCode, s]));
  const shortCodes = staff.map((s) => s.shortCode);

  // Track night rotation state: each night-eligible staff cycles N → N → SD → DO
  const nightCycleState = new Map<string, number>(); // shortCode -> position in cycle (0=N,1=N,2=SD,3=DO)
  for (const sc of [...NIGHT_PREDOMINANT, ...NIGHT_EMD]) {
    if (staffByCode.has(sc)) nightCycleState.set(sc, 0);
  }

  // Track how many nights each person has this month
  const nightCount = new Map<string, number>();
  shortCodes.forEach((sc) => nightCount.set(sc, 0));

  // Build PM rotation pool for weekdays
  const pmWeekdayPool = [...PM_PREDOMINANT].filter((sc) => staffByCode.has(sc));
  let pmWeekdayIdx = 0;

  const days: DayRow[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    const dayName = DAY_NAMES[dow];
    const isWeekend = dow === 0 || dow === 6;
    const isSat = dow === 6;
    const isSun = dow === 0;

    const shifts: Record<string, string> = {};

    // ── Step 1: Annual Leave ──
    for (const sc of shortCodes) {
      const member = staffByCode.get(sc)!;
      const onLeave = member.annualLeaves.some(
        (l) => l.approved && date >= new Date(l.startDate) && date <= new Date(l.endDate),
      );
      if (onLeave) {
        shifts[sc] = 'A';
      }
    }

    // ── Step 2: Night Shifts (N → N → SD → DO cycle) ──
    // Main lab night staff
    for (const sc of NIGHT_PREDOMINANT) {
      if (shifts[sc]) continue; // on leave
      if (!staffByCode.has(sc)) continue;
      const pos = nightCycleState.get(sc) ?? 0;
      const cycle = ['N', 'N', 'SD', 'DO'];
      const shift = cycle[pos % 4];
      shifts[sc] = shift;
      nightCycleState.set(sc, (pos + 1) % 4);
      if (shift === 'N') nightCount.set(sc, (nightCount.get(sc) ?? 0) + 1);
    }

    // Night EMD staff
    for (const sc of NIGHT_EMD) {
      if (shifts[sc]) continue; // already assigned or on leave
      if (!staffByCode.has(sc)) continue;
      const pos = nightCycleState.get(sc) ?? 0;
      const cycle = ['N+EMD', 'N+EMD', 'SD', 'DO'];
      const shift = cycle[pos % 4];
      shifts[sc] = shift;
      nightCycleState.set(sc, (pos + 1) % 4);
      if (shift === 'N+EMD') nightCount.set(sc, (nightCount.get(sc) ?? 0) + 1);
    }

    // ── Step 3: EMD Staff (non-night days) ──
    for (const sc of EMD_PREDOMINANT) {
      if (shifts[sc]) continue; // already assigned (night-emd or leave)
      if (!staffByCode.has(sc)) continue;

      if (isWeekend) {
        // EMD staff on weekends: alternate OH+EMD and DO
        const hash = simpleHash(sc + day);
        shifts[sc] = hash % 2 === 0 ? 'OH+EMD' : 'DO';
      } else {
        // Weekdays: rotate OH+EMD / PM+EMD
        const hash = simpleHash(sc + day);
        shifts[sc] = hash % 3 === 0 ? 'PM+EMD' : 'OH+EMD';
      }
    }

    // ── Step 4: BIMA Staff ──
    for (const sc of BIMA_PREDOMINANT) {
      if (shifts[sc]) continue;
      if (!staffByCode.has(sc)) continue;

      if (isWeekend) {
        if (isSun && WEEKEND_SUN_ONLY.includes(sc)) {
          shifts[sc] = 'OH+BIMA';
        } else {
          shifts[sc] = 'DO';
        }
      } else {
        shifts[sc] = 'OH+BIMA';
      }
    }

    // ── Step 5: PM-Predominant Staff ──
    for (const sc of PM_PREDOMINANT) {
      if (shifts[sc]) continue;
      if (!staffByCode.has(sc)) continue;

      if (isWeekend) {
        shifts[sc] = 'DO';
      } else {
        shifts[sc] = 'PM';
      }
    }

    // ── Step 6: OH-Weekday + PM shuffle/Sunday ──
    for (const sc of OH_WEEKDAY_PM_SHUFFLE_WEEKEND) {
      if (shifts[sc]) continue;
      if (!staffByCode.has(sc)) continue;

      if (isWeekend) {
        if (isSat && WEEKEND_SAT_ONLY.includes(sc)) {
          shifts[sc] = 'OH';
        } else {
          shifts[sc] = 'DO';
        }
      } else {
        // Mostly OH, occasional PM
        const hash = simpleHash(sc + day);
        shifts[sc] = hash % 5 === 0 ? 'PM' : 'OH';
      }
    }

    for (const sc of OH_WEEKDAY_PM_SUNDAY) {
      if (shifts[sc]) continue;
      if (!staffByCode.has(sc)) continue;

      if (isSun) {
        shifts[sc] = 'PM';
      } else if (isSat) {
        shifts[sc] = 'DO';
      } else {
        shifts[sc] = 'OH';
      }
    }

    // ── Step 7: OH-Only Staff ──
    for (const sc of OH_ONLY) {
      if (shifts[sc]) continue;
      if (!staffByCode.has(sc)) continue;

      if (isWeekend) {
        if (isSat && WEEKEND_SAT_ONLY.includes(sc)) {
          shifts[sc] = 'OH';
        } else if (isSun && WEEKEND_SUN_ONLY.includes(sc)) {
          shifts[sc] = 'OH';
        } else {
          shifts[sc] = 'DO';
        }
      } else {
        shifts[sc] = 'OH';
      }
    }

    // ── Step 8: Remaining unassigned staff get defaults ──
    for (const sc of shortCodes) {
      if (shifts[sc]) continue;
      if (!staffByCode.has(sc)) continue;

      if (isWeekend) {
        shifts[sc] = 'DO';
      } else {
        shifts[sc] = 'OH';
      }
    }

    // ── Step 9: Ensure minimum PM coverage on weekdays ──
    if (!isWeekend) {
      const pmWorkers = shortCodes.filter((sc) => shifts[sc] === 'PM' || shifts[sc] === 'PM+EMD');
      if (pmWorkers.length < 2 && pmWeekdayPool.length > 0) {
        // Pull one more from PM pool
        const candidate = pmWeekdayPool[pmWeekdayIdx % pmWeekdayPool.length];
        if (shifts[candidate] === 'OH' || shifts[candidate] === 'DO') {
          shifts[candidate] = 'PM';
        }
        pmWeekdayIdx++;
      }
    }

    days.push({ date: day, dayName, shifts });
  }

  // ── Validation: check night count caps ──
  for (const [sc, count] of nightCount) {
    if (count > 8) {
      // Redistribute excess – find days where this person has N and swap with DO
      let excess = count - 8;
      for (const dayRow of days) {
        if (excess <= 0) break;
        if (dayRow.shifts[sc] === 'N' || dayRow.shifts[sc] === 'N+EMD') {
          dayRow.shifts[sc] = 'DO';
          excess--;
        }
      }
    }
  }

  return {
    staffList,
    days,
    meta: {
      month,
      year,
      daysInMonth,
      generatedAt: new Date().toISOString(),
    },
  };
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
