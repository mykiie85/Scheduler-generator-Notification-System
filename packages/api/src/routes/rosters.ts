import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { generateRoster } from '../services/roster-generator.js';
import { exportRosterXlsx } from '../services/xlsx-export.js';

const prisma = new PrismaClient();
export const rosterRouter = Router();

rosterRouter.use(authMiddleware);

// Generate roster for a month
rosterRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { month, year } = z
      .object({ month: z.number().min(1).max(12), year: z.number().min(2024) })
      .parse(req.body);

    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      include: { constraints: { where: { month, year } }, annualLeaves: true },
    });

    const rosterData = generateRoster(staff, month, year);

    const roster = await prisma.roster.upsert({
      where: { month_year: { month, year } },
      update: { data: rosterData, status: 'draft', createdBy: req.user?.userId },
      create: { month, year, data: rosterData, status: 'draft', createdBy: req.user?.userId },
    });

    res.json(roster);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to generate roster' });
  }
});

// Get roster for a month
rosterRouter.get('/:year/:month', async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);
    const roster = await prisma.roster.findUnique({
      where: { month_year: { month, year } },
    });
    if (!roster) {
      res.status(404).json({ error: 'No roster found for this month' });
      return;
    }
    res.json(roster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

// Save edited roster
rosterRouter.put('/:year/:month', async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);
    const { data, status } = z
      .object({ data: z.any(), status: z.string().optional() })
      .parse(req.body);

    const roster = await prisma.roster.update({
      where: { month_year: { month, year } },
      data: { data, status: status || 'draft' },
    });
    res.json(roster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save roster' });
  }
});

// Export roster as XLSX
rosterRouter.get('/:year/:month/export', async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);
    const roster = await prisma.roster.findUnique({
      where: { month_year: { month, year } },
    });
    if (!roster) {
      res.status(404).json({ error: 'No roster found' });
      return;
    }

    const buffer = await exportRosterXlsx(roster.data as Record<string, unknown>, month, year);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=roster-${year}-${String(month).padStart(2, '0')}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// List all rosters
rosterRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const rosters = await prisma.roster.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { id: true, month: true, year: true, status: true, createdAt: true },
    });
    res.json(rosters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list rosters' });
  }
});
