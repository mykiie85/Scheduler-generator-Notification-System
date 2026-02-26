import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { exportAllocationDocx } from '../services/docx-export.js';

const prisma = new PrismaClient();
export const allocationRouter = Router();

allocationRouter.use(authMiddleware);

// Create weekly allocation
allocationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      weekStart: z.string().datetime(),
      weekEnd: z.string().datetime(),
      data: z.record(z.array(z.string())),
    });
    const { weekStart, weekEnd, data } = schema.parse(req.body);
    const allocation = await prisma.weeklyAllocation.create({
      data: {
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        data,
        createdBy: req.user?.userId,
      },
    });
    res.status(201).json(allocation);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create allocation' });
  }
});

// List allocations
allocationRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const allocations = await prisma.weeklyAllocation.findMany({
      orderBy: { weekStart: 'desc' },
    });
    res.json(allocations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch allocations' });
  }
});

// Get single allocation
allocationRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const allocation = await prisma.weeklyAllocation.findUnique({
      where: { id: req.params.id },
    });
    if (!allocation) {
      res.status(404).json({ error: 'Allocation not found' });
      return;
    }
    res.json(allocation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch allocation' });
  }
});

// Export as DOCX
allocationRouter.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const allocation = await prisma.weeklyAllocation.findUnique({
      where: { id: req.params.id },
    });
    if (!allocation) {
      res.status(404).json({ error: 'Allocation not found' });
      return;
    }
    const buffer = await exportAllocationDocx(allocation);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=weekly-allocation.docx');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});
