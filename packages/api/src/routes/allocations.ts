import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { exportAllocationDocx } from '../services/docx-export.js';
import { config } from '../config.js';

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

// Normalize phone to +255 format
function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('255')) return '+' + digits;
  if (digits.startsWith('0')) return '+255' + digits.slice(1);
  return '+255' + digits;
}

// Format date as "March 9, 2026"
function formatDateHuman(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Notify staff via n8n webhook
allocationRouter.post('/:id/notify', async (req: Request, res: Response) => {
  try {
    const allocation = await prisma.weeklyAllocation.findUnique({
      where: { id: req.params.id },
    });
    if (!allocation) {
      res.status(404).json({ error: 'Allocation not found' });
      return;
    }

    const webhookUrl = config.webhooks.weeklyAllocationUrl;
    if (!webhookUrl) {
      res.status(500).json({ error: 'Webhook URL not configured' });
      return;
    }

    // Parse allocation data: { "Hematology": ["Staff Name", ...], ... }
    const allocData = allocation.data as Record<string, string[]>;
    const sectionNames = Object.keys(allocData);

    // Collect all unique staff names
    const allNames = [...new Set(Object.values(allocData).flat())];

    // Query staff and section duties in parallel
    const [staffRecords, sectionDuties] = await Promise.all([
      prisma.staff.findMany({ where: { fullName: { in: allNames } } }),
      prisma.sectionDuty.findMany({ where: { sectionName: { in: sectionNames } } }),
    ]);

    // Build lookup maps
    const staffMap = new Map(staffRecords.map((s) => [s.fullName, s]));
    const dutyMap = new Map(sectionDuties.map((d) => [d.sectionName, d]));

    // Build section_id slug from section name
    const toSectionId = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

    // Build per-staff payload entries
    const allocations: Array<{
      section_id: string;
      section_name: string;
      staff_id: string;
      staff_name: string;
      phone_number: string;
      duties: string | null;
    }> = [];

    for (const [sectionName, staffNames] of Object.entries(allocData)) {
      const sectionDuty = dutyMap.get(sectionName);
      const duties = sectionDuty
        ? [
            'Key Responsibilities:',
            ...(sectionDuty.duties as string[]).map((d) => `- ${d}`),
            '',
            'Performance Expectations:',
            ...(sectionDuty.responsibilities as string[]).map((r) => `- ${r}`),
          ].join('\n')
        : null;

      for (const name of staffNames) {
        const staffRecord = staffMap.get(name);
        allocations.push({
          section_id: toSectionId(sectionName),
          section_name: sectionName,
          staff_id: staffRecord?.id ?? '',
          staff_name: name,
          phone_number: normalizePhone(staffRecord?.phone ?? null),
          duties,
        });
      }
    }

    // POST to n8n webhook
    const payload = {
      week_start: allocation.weekStart.toISOString().split('T')[0],
      week_end: allocation.weekEnd.toISOString().split('T')[0],
      instance: 'lab_scheduler',
      allocations,
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

    res.json({
      message: 'Staff notified successfully',
      count: allocations.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to notify staff' });
  }
});
