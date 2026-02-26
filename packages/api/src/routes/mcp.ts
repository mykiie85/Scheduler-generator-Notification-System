import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const mcpRouter = Router();

mcpRouter.use(authMiddleware);

// MCP Tool: Search staff
mcpRouter.post('/search-staff', async (req: Request, res: Response) => {
  try {
    const { query, section, category } = req.body;
    const where: Record<string, unknown> = { isActive: true };
    if (section) where.primarySection = section;
    if (category) where.category = category;
    if (query) {
      where.OR = [
        { fullName: { contains: query, mode: 'insensitive' } },
        { fileNo: { contains: query, mode: 'insensitive' } },
      ];
    }
    const staff = await prisma.staff.findMany({ where: where as any });
    res.json({ tool: 'search_staff', result: staff });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// MCP Tool: Check leave
mcpRouter.post('/check-leave', async (req: Request, res: Response) => {
  try {
    const { staffId, date } = req.body;
    const checkDate = new Date(date);
    const leaves = await prisma.annualLeave.findMany({
      where: {
        staffId,
        startDate: { lte: checkDate },
        endDate: { gte: checkDate },
        approved: true,
      },
    });
    res.json({ tool: 'check_leave', onLeave: leaves.length > 0, leaves });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Check failed' });
  }
});

// MCP Tool: Update shift
mcpRouter.post('/update-shift', async (req: Request, res: Response) => {
  try {
    const { rosterId, staffId, day, shift } = req.body;
    const roster = await prisma.roster.findUnique({ where: { id: rosterId } });
    if (!roster) {
      res.status(404).json({ error: 'Roster not found' });
      return;
    }
    const data = roster.data as Record<string, Record<string, string>>;
    if (!data[staffId]) data[staffId] = {};
    data[staffId][String(day)] = shift;
    await prisma.roster.update({ where: { id: rosterId }, data: { data } });
    res.json({ tool: 'update_shift', success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// MCP Tool: Send notification (stub)
mcpRouter.post('/send-notification', async (req: Request, res: Response) => {
  try {
    const { recipient, channel, subject, body } = req.body;
    const notification = await prisma.notification.create({
      data: {
        type: 'mcp',
        channel: channel || 'whatsapp',
        recipient,
        subject,
        body,
        status: 'sent_stub',
        sentAt: new Date(),
      },
    });
    console.log(`[STUB] Notification sent via ${channel} to ${recipient}: ${subject}`);
    res.json({ tool: 'send_notification', success: true, notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Notification failed' });
  }
});
