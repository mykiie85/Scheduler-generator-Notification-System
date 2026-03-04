import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';

interface StaffInfo {
  fullName: string;
}

interface HolidayExportData {
  date: Date;
  holidayName: string;
  mainLabAm: StaffInfo[];
  mainLabPm: StaffInfo[];
  emdLabAm: StaffInfo[];
  emdLabPm: StaffInfo[];
  bimaLabAm: StaffInfo[];
}

const FONT = 'Times New Roman';
const SIZE = 24; // 12pt

function textRun(text: string, opts?: { bold?: boolean; underline?: boolean; size?: number }): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: opts?.size ?? SIZE,
    bold: opts?.bold,
    underline: opts?.underline ? {} : undefined,
  });
}

function emptyPara(spacing?: number): Paragraph {
  return new Paragraph({ spacing: { after: spacing ?? 100 } });
}

function buildShiftTable(
  labs: { name: string; staff: StaffInfo[] }[],
): Table {
  const maxRows = Math.max(1, ...labs.map((l) => l.staff.length));

  const headerRow = new TableRow({
    children: labs.map(
      (lab) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [textRun(lab.name, { bold: true })],
              alignment: AlignmentType.LEFT,
            }),
          ],
          width: { size: Math.floor(100 / labs.length), type: WidthType.PERCENTAGE },
          borders: noBorders(),
        }),
    ),
  });

  const dataRows: TableRow[] = [];
  for (let i = 0; i < maxRows; i++) {
    dataRows.push(
      new TableRow({
        children: labs.map(
          (lab) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    textRun(
                      lab.staff[i] ? `${i + 1}.  ${lab.staff[i].fullName}` : '',
                    ),
                  ],
                }),
              ],
              borders: noBorders(),
            }),
        ),
      }),
    );
  }

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: none, bottom: none, left: none, right: none };
}

function buildSignatureTable(): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: ['Name', 'Title', 'Date', 'Signature'].map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [textRun(h, { bold: true, size: 20 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: 'D9E2F3' },
        }),
    ),
  });

  const emptyRows: TableRow[] = [];
  for (let i = 0; i < 25; i++) {
    emptyRows.push(
      new TableRow({
        children: [0, 1, 2, 3].map(
          () =>
            new TableCell({
              children: [new Paragraph({ children: [textRun(' ')] })],
            }),
        ),
      }),
    );
  }

  return new Table({
    rows: [headerRow, ...emptyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

export async function exportHolidayDocx(input: HolidayExportData): Promise<Buffer> {
  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const holidayDate = formatDate(input.date);

  const amLabs = [
    { name: 'MAIN LAB', staff: input.mainLabAm },
    { name: 'EMD LAB', staff: input.emdLabAm },
    { name: 'BIMA LAB', staff: input.bimaLabAm },
  ].filter((l) => l.staff.length > 0);

  const pmLabs = [
    { name: 'MAIN LAB', staff: input.mainLabPm },
    { name: 'EMD LAB', staff: input.emdLabPm },
  ].filter((l) => l.staff.length > 0);

  const children: (Paragraph | Table)[] = [
    // Header
    new Paragraph({
      children: [textRun('From:', { bold: true }), textRun('     Laboratory Manager')],
    }),
    new Paragraph({
      children: [textRun('To:', { bold: true }), textRun('       All Laboratory staffs.')],
    }),
    new Paragraph({
      children: [textRun('Date:', { bold: true }), textRun(`     ${holidayDate}`)],
    }),
    emptyPara(200),
    new Paragraph({
      children: [textRun(`RE: PUBLIC HOLIDAY`, { bold: true, underline: true })],
    }),
    emptyPara(200),
    new Paragraph({
      children: [
        textRun(
          `I am pleased to inform all staff on ${holidayDate} will be ${input.holidayName} so the following staff shall be on duty.`,
        ),
      ],
    }),
    emptyPara(200),
    new Paragraph({
      children: [textRun(holidayDate, { bold: true, underline: true })],
    }),
    emptyPara(100),
  ];

  // AM SHIFT
  if (amLabs.length > 0) {
    children.push(
      new Paragraph({
        children: [textRun('AM SHIFT', { bold: true, underline: true })],
      }),
      emptyPara(100),
      buildShiftTable(amLabs),
      emptyPara(200),
    );
  }

  // PM SHIFT
  if (pmLabs.length > 0) {
    children.push(
      new Paragraph({
        children: [textRun('PM SHIFT', { bold: true, underline: true })],
      }),
      emptyPara(100),
      buildShiftTable(pmLabs),
      emptyPara(200),
    );
  }

  children.push(
    new Paragraph({
      children: [textRun('NIGHT SHIFT WILL BE AS SCHEDULE.', { bold: true })],
    }),
    emptyPara(300),
    new Paragraph({
      children: [textRun('Your cooperation is highly appreciated,')],
    }),
    emptyPara(100),
    new Paragraph({
      children: [textRun('Ekinala Mwasamanyambi', { bold: true })],
    }),
    new Paragraph({
      children: [textRun('Deputy Laboratory Manager')],
    }),
    new Paragraph({
      children: [textRun('Mwananyamala Regional Referral Hospital Laboratory.')],
    }),
    emptyPara(400),
    buildSignatureTable(),
  );

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
