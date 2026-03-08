import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { config } from '../config.js';

const prisma = new PrismaClient();
export const eventRouter = Router();

eventRouter.use(authMiddleware);

const eventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.string().datetime(),
  time: z.string().optional(),
  location: z.string().optional(),
  notifyAll: z.boolean().optional(),
  notifyIds: z.array(z.string()).optional(),
});

// Normalize phone to 255 format
function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('255')) return digits;
  if (digits.startsWith('0')) return '255' + digits.slice(1);
  return '255' + digits;
}

// Send event notification to n8n webhook
async function sendEventWebhook(event: {
  title: string;
  description: string | null;
  date: Date;
  time: string | null;
  location: string | null;
  notifyAll: boolean;
  notifyIds: string[];
}) {
  const webhookUrl = config.webhooks.eventUrl;
  if (!webhookUrl) return;

  // Resolve staff
  let staffRecords: { fullName: string; phone: string | null; primarySection: string }[];
  if (event.notifyAll) {
    staffRecords = await prisma.staff.findMany({
      where: { isActive: true },
      select: { fullName: true, phone: true, primarySection: true },
    });
  } else if (event.notifyIds.length > 0) {
    staffRecords = await prisma.staff.findMany({
      where: { id: { in: event.notifyIds } },
      select: { fullName: true, phone: true, primarySection: true },
    });
  } else {
    staffRecords = [];
  }

  const payload: Record<string, unknown> = {
    event: {
      title: event.title,
      description: event.description || '',
      date: event.date.toISOString().split('T')[0],
      time: event.time || '00:00hrs',
      location: event.location || '',
      type: 'event',
    },
    hospital: 'Mwananyamala Regional Referral Hospital Laboratory',
    notify_all: event.notifyAll,
    selected_staff: staffRecords.map((s) => ({
      staff_name: s.fullName,
      phone_number: normalizePhone(s.phone),
      department: s.primarySection,
    })),
  };

  // Include group info when notifying all staff
  if (event.notifyAll) {
    payload.send_mode = 'both';
    payload.group = {
      id: '255714269583-1475527231@g.us',
      name: 'MRRH LABORATORY.',
    };
  } else {
    payload.send_mode = 'individual';
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
}

// Create event (also triggers notification)
eventRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = eventSchema.parse(req.body);
    const event = await prisma.event.create({
      data: {
        ...data,
        date: new Date(data.date),
        createdBy: req.user?.userId,
      },
    });

    // Send notification to n8n webhook
    try {
      await sendEventWebhook({
        title: data.title,
        description: data.description || null,
        date: new Date(data.date),
        time: data.time || null,
        location: data.location || null,
        notifyAll: data.notifyAll ?? false,
        notifyIds: data.notifyIds ?? [],
      });
    } catch (webhookErr) {
      console.error('Event webhook failed:', webhookErr);
      // Don't fail the create if webhook fails
    }

    res.status(201).json(event);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// List events
eventRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({ orderBy: { date: 'desc' } });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Update event
eventRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = eventSchema.partial().parse(req.body);
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
    res.json(event);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Re-send event notification
eventRouter.post('/:id/notify', async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const webhookUrl = config.webhooks.eventUrl;
    if (!webhookUrl) {
      res.status(500).json({ error: 'Event webhook URL not configured' });
      return;
    }

    await sendEventWebhook({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      notifyAll: event.notifyAll,
      notifyIds: event.notifyIds,
    });

    res.json({ message: 'Notification sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Delete event
eventRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});
