import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { exportHolidayDocx } from '../services/holiday-docx-export.js';

const prisma = new PrismaClient();
export const holidayRouter = Router();

holidayRouter.use(authMiddleware);

const holidayDataSchema = z.object({
  mainLabAm: z.array(z.string().uuid()).optional().default([]),
  mainLabPm: z.array(z.string().uuid()).optional().default([]),
  emdLabAm: z.array(z.string().uuid()).optional().default([]),
  emdLabPm: z.array(z.string().uuid()).optional().default([]),
  bimaLabAm: z.array(z.string().uuid()).optional().default([]),
});

const holidaySchema = z.object({
  date: z.string().datetime(),
  holidayName: z.string(),
  amStaffId: z.string().uuid().optional(),
  pmStaffId: z.string().uuid().optional(),
  nightPull: z.boolean().optional(),
  data: holidayDataSchema.optional(),
});

// Create holiday shift
holidayRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = holidaySchema.parse(req.body);
    const shift = await prisma.holidayShift.create({
      data: {
        ...body,
        date: new Date(body.date),
        data: body.data ?? undefined,
      },
    });
    res.status(201).json(shift);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create holiday shift' });
  }
});

// List holiday shifts
holidayRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const where = year
      ? {
          date: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${Number(year) + 1}-01-01`),
          },
        }
      : {};
    const shifts = await prisma.holidayShift.findMany({
      where,
      orderBy: { date: 'asc' },
      include: { amStaff: true },
    });
    res.json(shifts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch holiday shifts' });
  }
});

// Update holiday shift
holidayRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = holidaySchema.partial().parse(req.body);
    const shift = await prisma.holidayShift.update({
      where: { id: req.params.id },
      data: {
        ...body,
        date: body.date ? new Date(body.date) : undefined,
        data: body.data ?? undefined,
      },
    });
    res.json(shift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update holiday shift' });
  }
});

// Export holiday shift as DOCX
holidayRouter.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const shift = await prisma.holidayShift.findUnique({
      where: { id: req.params.id },
    });
    if (!shift) {
      res.status(404).json({ error: 'Holiday shift not found' });
      return;
    }

    const shiftData = (shift.data as Record<string, string[]>) ?? {};
    const allStaffIds = [
      ...(shiftData.mainLabAm ?? []),
      ...(shiftData.mainLabPm ?? []),
      ...(shiftData.emdLabAm ?? []),
      ...(shiftData.emdLabPm ?? []),
      ...(shiftData.bimaLabAm ?? []),
    ];

    const staffList = allStaffIds.length > 0
      ? await prisma.staff.findMany({ where: { id: { in: allStaffIds } } })
      : [];

    const staffMap = new Map(staffList.map((s) => [s.id, { fullName: s.fullName }]));
    const resolve = (ids: string[]) =>
      ids.map((id) => staffMap.get(id)).filter(Boolean) as { fullName: string }[];

    const buffer = await exportHolidayDocx({
      date: shift.date,
      holidayName: shift.holidayName,
      mainLabAm: resolve(shiftData.mainLabAm ?? []),
      mainLabPm: resolve(shiftData.mainLabPm ?? []),
      emdLabAm: resolve(shiftData.emdLabAm ?? []),
      emdLabPm: resolve(shiftData.emdLabPm ?? []),
      bimaLabAm: resolve(shiftData.bimaLabAm ?? []),
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=holiday-${shift.holidayName.replace(/\s+/g, '-')}.docx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Delete holiday shift
holidayRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.holidayShift.delete({ where: { id: req.params.id } });
    res.json({ message: 'Holiday shift deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete holiday shift' });
  }
});
