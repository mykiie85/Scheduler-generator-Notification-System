import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const leaveRouter = Router();

leaveRouter.use(authMiddleware);

const leaveSchema = z.object({
  staffId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().optional(),
  approved: z.boolean().optional(),
});

// Create leave
leaveRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = leaveSchema.parse(req.body);
    const leave = await prisma.annualLeave.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
    res.status(201).json(leave);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create leave' });
  }
});

// List all leave (optionally by staff or year)
leaveRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { staffId, year } = req.query;
    const where: Record<string, unknown> = {};
    if (staffId) where.staffId = staffId;
    if (year) {
      where.startDate = {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${Number(year) + 1}-01-01`),
      };
    }
    const leaves = await prisma.annualLeave.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: { staff: { select: { fullName: true, fileNo: true } } },
    });
    res.json(leaves);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

// Approve/update leave
leaveRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = leaveSchema.partial().parse(req.body);
    const leave = await prisma.annualLeave.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    res.json(leave);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update leave' });
  }
});

// Delete leave
leaveRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.annualLeave.delete({ where: { id: req.params.id } });
    res.json({ message: 'Leave deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete leave' });
  }
});
