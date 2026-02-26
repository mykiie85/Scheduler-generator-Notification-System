import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const holidayRouter = Router();

holidayRouter.use(authMiddleware);

const holidaySchema = z.object({
  date: z.string().datetime(),
  holidayName: z.string(),
  amStaffId: z.string().uuid().optional(),
  pmStaffId: z.string().uuid().optional(),
  nightPull: z.boolean().optional(),
});

// Create holiday shift
holidayRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = holidaySchema.parse(req.body);
    const shift = await prisma.holidayShift.create({
      data: {
        ...data,
        date: new Date(data.date),
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
    const data = holidaySchema.partial().parse(req.body);
    const shift = await prisma.holidayShift.update({
      where: { id: req.params.id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
    res.json(shift);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update holiday shift' });
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
