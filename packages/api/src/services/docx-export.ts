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
  HeadingLevel,
} from 'docx';

interface AllocationData {
  weekStart: Date;
  weekEnd: Date;
  data: Record<string, string[]>; // section -> staff names
}

export async function exportAllocationDocx(allocation: AllocationData): Promise<Buffer> {
  const data = allocation.data as Record<string, string[]>;
  const sections = Object.keys(data);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const rows = sections.map(
    (section) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: section, bold: true, size: 20 })],
              }),
            ],
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: (data[section] || []).join(', '), size: 20 })],
              }),
            ],
            width: { size: 70, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'WEEKLY JOB ALLOCATION',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Week: ${formatDate(new Date(allocation.weekStart))} - ${formatDate(new Date(allocation.weekEnd))}`,
                size: 22,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Section', bold: true, size: 22 })],
                      }),
                    ],
                    shading: { fill: '0F3C68' },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Staff Assigned', bold: true, size: 22 })],
                      }),
                    ],
                    shading: { fill: '0F3C68' },
                    width: { size: 70, type: WidthType.PERCENTAGE },
                  }),
                ],
                tableHeader: true,
              }),
              ...rows,
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
