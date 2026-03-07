import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const staffRouter = Router();

staffRouter.use(authMiddleware);

const staffSchema = z.object({
  fileNo: z.string(),
  checkNo: z.string().optional(),
  fullName: z.string(),
  category: z.enum(['LAB_SCIENTIST', 'LAB_TECHNOLOGIST', 'LAB_ATTENDANT', 'ATTENDANT']),
  primarySection: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  hireDate: z.string().datetime().optional(),
});

// List all staff
staffRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { fullName: 'asc' },
      include: { constraints: true, annualLeaves: true },
    });
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Get single staff
staffRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: req.params.id },
      include: { constraints: true, annualLeaves: true, holidayShifts: true },
    });
    if (!staff) {
      res.status(404).json({ error: 'Staff not found' });
      return;
    }
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Create staff
staffRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = staffSchema.parse(req.body);
    const staff = await prisma.staff.create({
      data: {
        ...data,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      },
    });
    res.status(201).json(staff);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

// Update staff
staffRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = staffSchema.partial().parse(req.body);
    const staff = await prisma.staff.update({
      where: { id: req.params.id },
      data: {
        ...data,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      },
    });
    res.json(staff);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

// Delete staff
staffRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.staff.delete({ where: { id: req.params.id } });
    res.json({ message: 'Staff deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

// Set staff constraints for a month
staffRouter.post('/:id/constraints', async (req: Request, res: Response) => {
  try {
    const constraintSchema = z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2024),
      maxNights: z.number().min(0).max(31).optional(),
      offDays: z.array(z.number().min(1).max(31)).optional(),
      preferred: z.enum(['MORNING', 'EVENING', 'NIGHT', 'OFF']).optional(),
      notes: z.string().optional(),
    });
    const data = constraintSchema.parse(req.body);
    const constraint = await prisma.staffConstraint.upsert({
      where: {
        staffId_month_year: {
          staffId: req.params.id,
          month: data.month,
          year: data.year,
        },
      },
      update: data,
      create: { staffId: req.params.id, ...data },
    });
    res.json(constraint);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to set constraints' });
  }
});
