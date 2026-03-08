import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { generateRoster } from '../services/roster-generator.js';
import { exportRosterXlsx } from '../services/xlsx-export.js';
import { config } from '../config.js';

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
      orderBy: { fileNo: 'asc' },
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

// Normalize phone to 255 format
function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('255')) return digits;
  if (digits.startsWith('0')) return '255' + digits.slice(1);
  return '255' + digits;
}

// Notify staff via n8n webhook (sends XLSX as base64)
rosterRouter.post('/:year/:month/notify', async (req: Request, res: Response) => {
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

    const webhookUrl = config.webhooks.rosterUrl;
    if (!webhookUrl) {
      res.status(500).json({ error: 'Roster webhook URL not configured' });
      return;
    }

    // Generate XLSX buffer and encode as base64
    const buffer = await exportRosterXlsx(roster.data as Record<string, unknown>, month, year);
    const xlsxBase64 = buffer.toString('base64');

    // Fetch all management users (app users) to send draft roster
    const appUsers = await prisma.user.findMany({
      where: { approvalStatus: 'APPROVED' },
      select: { fullName: true, phone: true, title: true },
    });

    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = MONTHS[month - 1];

    const payload = {
      type: 'draft_roster',
      month,
      year,
      month_name: monthName,
      filename: `roster-${year}-${String(month).padStart(2, '0')}.xlsx`,
      xlsx_base64: xlsxBase64,
      hospital: 'Mwananyamala Regional Referral Hospital Laboratory',
      send_mode: 'individual',
      message: `Draft Duty Roster for ${monthName} ${year} - Please review and refine before publishing.`,
      staff: appUsers.map((u) => ({
        staff_name: u.fullName,
        phone_number: normalizePhone(u.phone),
        title: u.title || '',
      })),
    };

    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!webhookRes.ok) {
      const text = await webhookRes.text();
      res.status(502).json({ error: `Webhook returned ${webhookRes.status}`, details: text });
      return;
    }

    res.json({ message: 'Draft roster sent to management team', recipientCount: appUsers.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to notify staff' });
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
