import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { sendNotification } from '../services/notification.js';

const prisma = new PrismaClient();
export const eventRouter = Router();

eventRouter.use(authMiddleware);

const eventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.string().datetime(),
  notifyAll: z.boolean().optional(),
  notifyIds: z.array(z.string()).optional(),
});

// Create event
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

    // Send notifications (stubbed)
    if (data.notifyAll) {
      const allStaff = await prisma.staff.findMany({ where: { isActive: true } });
      for (const s of allStaff) {
        await sendNotification({
          type: 'event',
          channel: 'whatsapp',
          recipient: s.phone || s.email || s.fullName,
          subject: data.title,
          body: data.description || data.title,
        });
      }
    } else if (data.notifyIds?.length) {
      for (const id of data.notifyIds) {
        const s = await prisma.staff.findUnique({ where: { id } });
        if (s) {
          await sendNotification({
            type: 'event',
            channel: 'whatsapp',
            recipient: s.phone || s.email || s.fullName,
            subject: data.title,
            body: data.description || data.title,
          });
        }
      }
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
