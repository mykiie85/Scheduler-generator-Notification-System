import ExcelJS from 'exceljs';

interface DayRow {
  date: number;
  dayName: string;
  shifts: Record<string, string>;
}

interface RosterData {
  staffList: Array<{ shortCode: string; fullName: string }>;
  days: DayRow[];
  meta: {
    month: number;
    year: number;
    daysInMonth: number;
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Column offset: data starts at column D (4)
const COL_OFFSET = 3;

const HEADER_GREEN = 'FF92D050';
const EMD_YELLOW = 'FFFFFF00';
const TITLE_GREEN_THEME = 1; // theme index for green

const BOLD_8: Partial<ExcelJS.Font> = { bold: true, size: 8 };
const NORMAL_8: Partial<ExcelJS.Font> = { size: 8 };

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
  right: { style: 'thin' },
};

function isEmdShift(shift: string): boolean {
  return shift.includes('EMD');
}

export async function exportRosterXlsx(
  rosterData: Record<string, unknown>,
  month: number,
  year: number,
): Promise<Buffer> {
  const data = rosterData as unknown as RosterData;
  const workbook = new ExcelJS.Workbook();
  const monthName = MONTH_NAMES[month - 1];
  const sheet = workbook.addWorksheet(`${monthName} ${year}`);

  // Zoom out so all staff columns fit on screen
  sheet.views = [{ state: 'normal', zoomScale: 50 }];

  const staffList = data.staffList || [];
  const days = data.days || [];
  const staffCount = staffList.length;
  // First staff col = COL_OFFSET + 3 (DATE at +1, DAY at +2, first staff at +3)
  const dateCol = COL_OFFSET + 1; // col 4 (D)
  const dayCol = COL_OFFSET + 2;  // col 5 (E)
  const firstStaffCol = COL_OFFSET + 3; // col 6 (F)
  const lastCol = firstStaffCol + staffCount - 1;

  // ── Row 1: Empty ──
  sheet.addRow([]);

  // ── Row 2: "Laboratory Duty Roster" | effective date | Document No ──
  const row2 = sheet.addRow([]);
  row2.getCell(dateCol).value = 'Laboratory Duty Roster';
  row2.getCell(dateCol + 6).value = `effective date -01/${String(month).padStart(2, '0')}/${year}`;
  row2.getCell(lastCol).value = 'Document No.- MRRL/F/190';

  // ── Row 3: review date | VERSION ──
  const row3 = sheet.addRow([]);
  row3.getCell(dateCol + 6).value = `review date-31/${String(month).padStart(2, '0')}/${year + 1 > year ? year : year}`;
  row3.getCell(lastCol).value = 'VERSION-4';

  // ── Row 4: Title ──
  const row4 = sheet.addRow([]);
  row4.height = 14;
  // Place title roughly centered
  const titleCol = dateCol + Math.floor((lastCol - dateCol) / 2);
  row4.getCell(titleCol).value = `${monthName} - ${year} MAIN LABORATORY DUTY ROSTER`;
  row4.getCell(titleCol).font = { bold: true, size: 9 };
  row4.getCell(titleCol).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { theme: 1 },
  };

  // ── Row 5: Column headers ──
  const headerRow = sheet.addRow([]);
  headerRow.height = 14;

  // DATE header
  headerRow.getCell(dateCol).value = 'DATE';
  headerRow.getCell(dateCol).font = BOLD_8;
  headerRow.getCell(dateCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_GREEN } };
  headerRow.getCell(dateCol).border = THIN_BORDER;
  headerRow.getCell(dateCol).alignment = { horizontal: 'center', vertical: 'middle' };

  // DAY header
  headerRow.getCell(dayCol).value = 'DAY';
  headerRow.getCell(dayCol).font = BOLD_8;
  headerRow.getCell(dayCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_GREEN } };
  headerRow.getCell(dayCol).border = THIN_BORDER;
  headerRow.getCell(dayCol).alignment = { horizontal: 'center', vertical: 'middle' };

  // Staff shortcode headers
  for (let i = 0; i < staffCount; i++) {
    const cell = headerRow.getCell(firstStaffCol + i);
    cell.value = staffList[i].shortCode;
    cell.font = BOLD_8;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_GREEN } };
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Set column widths - compact to fit all staff on screen
  sheet.getColumn(dateCol).width = 10;
  sheet.getColumn(dayCol).width = 5;
  for (let i = 0; i < staffCount; i++) {
    sheet.getColumn(firstStaffCol + i).width = Math.max(staffList[i].shortCode.length + 1, 6);
  }

  // ── Data rows (one per day) ──
  const DAY_NAMES_UPPER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  for (const dayRow of days) {
    const excelRow = sheet.addRow([]);
    excelRow.height = 14;

    // DATE cell - full Date object
    const dateVal = new Date(year, month - 1, dayRow.date);
    const dateCell = excelRow.getCell(dateCol);
    dateCell.value = dateVal;
    dateCell.font = BOLD_8;
    dateCell.alignment = { horizontal: 'center' };
    dateCell.border = THIN_BORDER;

    // DAY cell - uppercase
    const dayCell = excelRow.getCell(dayCol);
    dayCell.value = dayRow.dayName.toUpperCase();
    dayCell.font = BOLD_8;
    dayCell.alignment = { horizontal: 'center' };
    dayCell.border = THIN_BORDER;

    // Shift cells
    for (let i = 0; i < staffCount; i++) {
      const cell = excelRow.getCell(firstStaffCol + i);
      const shift = dayRow.shifts[staffList[i].shortCode] || '';
      cell.value = shift;
      cell.font = BOLD_8;
      cell.alignment = { horizontal: 'center' };
      cell.border = THIN_BORDER;

      // EMD shifts get yellow background
      if (isEmdShift(shift)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMD_YELLOW } };
      }
    }
  }

  // ── Empty row with green cell ──
  const emptyRow = sheet.addRow([]);
  emptyRow.height = 14;
  emptyRow.getCell(dateCol).value = ' ';
  emptyRow.getCell(dateCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_GREEN } };
  emptyRow.getCell(dateCol).font = BOLD_8;

  // ── Footer: Prepared by / Approved by ──
  const footerRow = sheet.addRow([]);
  footerRow.height = 14;
  footerRow.getCell(dateCol).value =
    'Prepared by EKINALA CHRISTOPHER\u2026\u2026\u2026\u2026\u2026\u2026\u2026..Deputy Lab Manager' +
    '                Approval by SHAURI NJAMA \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026              LAB MANAGER' +
    '        \u2026........  Date \u2026..............';
  footerRow.getCell(dateCol).font = BOLD_8;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
