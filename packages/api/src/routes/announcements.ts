import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { config } from '../config.js';

const prisma = new PrismaClient();
export const announcementRouter = Router();

announcementRouter.use(authMiddleware);

// Rate limit: max 5 announcement notifications per day
const DAILY_LIMIT = 5;
let notifyCount = 0;
let notifyDate = new Date().toDateString();

function checkNotifyLimit(): string | null {
  const today = new Date().toDateString();
  if (today !== notifyDate) {
    notifyDate = today;
    notifyCount = 0;
  }
  if (notifyCount >= DAILY_LIMIT) {
    return `Daily announcement limit reached (${DAILY_LIMIT}/day). Try again tomorrow.`;
  }
  return null;
}

function incrementNotifyCount() {
  notifyCount++;
}

// Normalize phone to 255 format
function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('255')) return digits;
  if (digits.startsWith('0')) return '255' + digits.slice(1);
  return '255' + digits;
}

const schema = z.object({
  title: z.string(),
  content: z.string(),
  date: z.string().datetime().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

// Send announcement webhook to n8n
async function sendAnnouncementWebhook(announcement: {
  title: string;
  content: string;
  date: Date | null;
  time: string | null;
  location: string | null;
}) {
  const webhookUrl = config.webhooks.announcementUrl;
  if (!webhookUrl) return;

  // Fetch ALL staff
  const staffRecords = await prisma.staff.findMany({
    where: { isActive: true },
    select: { fullName: true, phone: true, primarySection: true },
  });

  const payload = {
    event: {
      title: announcement.title,
      description: announcement.content,
      date: announcement.date ? announcement.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      time: announcement.time || '00:00hrs',
      location: announcement.location || '',
      type: 'announcement',
    },
    hospital: 'Mwananyamala Regional Referral Hospital Laboratory',
    send_mode: 'both',
    group: {
      id: '255714269583-1475527231@g.us',
      name: 'MRRH LABORATORY.',
    },
    all_staff: staffRecords.map((s) => ({
      staff_name: s.fullName,
      phone_number: normalizePhone(s.phone),
      department: s.primarySection,
    })),
  };

  console.log('Sending announcement webhook to:', webhookUrl);
  console.log('Payload staff count:', payload.all_staff.length);

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  const responseText = await res.text();
  console.log('Webhook response:', res.status, responseText);

  if (!res.ok) {
    throw new Error(`Webhook returned ${res.status}: ${responseText}`);
  }
}

// Create announcement (auto-notifies when mode is "now")
announcementRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = schema.parse(req.body);
    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        date: data.date ? new Date(data.date) : null,
        time: data.time || null,
        location: data.location || null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        createdBy: req.user?.userId,
      },
    });

    // Auto-notify if not scheduled for later
    let webhookSent = false;
    let webhookError = '';
    if (!data.scheduledAt) {
      const limitErr = checkNotifyLimit();
      if (limitErr) {
        webhookError = limitErr;
      } else try {
        await sendAnnouncementWebhook({
          title: data.title,
          content: data.content,
          date: data.date ? new Date(data.date) : null,
          time: data.time || null,
          location: data.location || null,
        });
        // Mark as sent
        await prisma.announcement.update({
          where: { id: announcement.id },
          data: { sentAt: new Date() },
        });
        incrementNotifyCount();
        webhookSent = true;
      } catch (webhookErr: any) {
        webhookError = webhookErr?.message || 'Unknown webhook error';
        console.error('Announcement webhook failed:', webhookErr);
      }
    }

    res.status(201).json({ ...announcement, webhookSent, webhookError });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// List announcements
announcementRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Update announcement
announcementRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = schema.partial().parse(req.body);
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
    });
    res.json(announcement);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Re-send announcement notification
announcementRouter.post('/:id/notify', async (req: Request, res: Response) => {
  try {
    const limitErr = checkNotifyLimit();
    if (limitErr) {
      res.status(429).json({ error: limitErr });
      return;
    }

    const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!announcement) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }

    const webhookUrl = config.webhooks.announcementUrl;
    if (!webhookUrl) {
      res.status(500).json({ error: 'Announcement webhook URL not configured' });
      return;
    }

    await sendAnnouncementWebhook({
      title: announcement.title,
      content: announcement.content,
      date: announcement.date,
      time: announcement.time,
      location: announcement.location,
    });

    // Mark as sent
    await prisma.announcement.update({
      where: { id: announcement.id },
      data: { sentAt: new Date() },
    });
    incrementNotifyCount();

    res.json({ message: 'Announcement sent successfully', remaining: DAILY_LIMIT - notifyCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send announcement' });
  }
});

// Delete announcement
announcementRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});
