import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const announcementRouter = Router();

announcementRouter.use(authMiddleware);

const schema = z.object({
  title: z.string(),
  content: z.string(),
  scheduledAt: z.string().datetime().optional(),
});

// Create announcement
announcementRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = schema.parse(req.body);
    const announcement = await prisma.announcement.create({
      data: {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        createdBy: req.user?.userId,
      },
    });
    res.status(201).json(announcement);
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
