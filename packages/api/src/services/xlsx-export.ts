import ExcelJS from 'exceljs';

interface RosterData {
  entries: Array<{
    staffId: string;
    staffName: string;
    section: string;
    category: string;
    shifts: Record<string, string>;
  }>;
  meta: {
    month: number;
    year: number;
    daysInMonth: number;
  };
}

const SHIFT_COLORS: Record<string, string> = {
  M: 'FFE8F5E9', // light green
  E: 'FFFFF3E0', // light orange
  N: 'FFE3F2FD', // light blue
  OFF: 'FFF5F5F5', // light gray
  AL: 'FFFFEBEE', // light red
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function exportRosterXlsx(
  rosterData: Record<string, unknown>,
  month: number,
  year: number,
): Promise<Buffer> {
  const data = rosterData as unknown as RosterData;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${MONTH_NAMES[month - 1]} ${year}`);

  // Header columns: #, Name, Section, Category, then days 1..N
  const columns: Partial<ExcelJS.Column>[] = [
    { header: '#', key: 'num', width: 4 },
    { header: 'Staff Name', key: 'name', width: 25 },
    { header: 'Section', key: 'section', width: 14 },
    { header: 'Category', key: 'category', width: 12 },
  ];

  const daysInMonth = data.meta?.daysInMonth || new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    columns.push({ header: `${d}\n${dayName}`, key: `d${d}`, width: 5 });
  }

  sheet.columns = columns;

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 9 };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3C68' } };
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Data rows
  const entries = data.entries || [];
  entries.forEach((entry, idx) => {
    const rowData: Record<string, unknown> = {
      num: idx + 1,
      name: entry.staffName,
      section: entry.section,
      category: entry.category,
    };
    for (let d = 1; d <= daysInMonth; d++) {
      rowData[`d${d}`] = entry.shifts[String(d)] || '';
    }
    const row = sheet.addRow(rowData);
    row.height = 18;
    row.font = { size: 9 };

    // Color shift cells
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = row.getCell(`d${d}`);
      const shift = entry.shifts[String(d)] || '';
      const color = SHIFT_COLORS[shift];
      if (color) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      }
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    }
  });

  // Title row at top
  sheet.insertRow(1, [`DUTY ROSTER - ${MONTH_NAMES[month - 1].toUpperCase()} ${year}`]);
  sheet.mergeCells(1, 1, 1, 4 + daysInMonth);
  const titleCell = sheet.getCell('A1');
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F3C68' } };
  titleCell.alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
