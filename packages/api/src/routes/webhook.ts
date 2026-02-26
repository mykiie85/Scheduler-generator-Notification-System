import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const webhookRouter = Router();

// n8n webhook endpoint - receives events to broadcast
webhookRouter.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const { type, title, body, recipients } = req.body;
    console.log(`[WEBHOOK] Broadcast received: type=${type}, title=${title}, recipients=${recipients?.length || 'all'}`);

    // Log as notifications
    const staffList = recipients?.length
      ? await prisma.staff.findMany({ where: { id: { in: recipients } } })
      : await prisma.staff.findMany({ where: { isActive: true } });

    for (const s of staffList) {
      await prisma.notification.create({
        data: {
          type: type || 'broadcast',
          channel: 'webhook',
          recipient: s.phone || s.email || s.fullName,
          subject: title,
          body: body || title,
          status: 'sent_stub',
          sentAt: new Date(),
        },
      });
    }

    res.json({ success: true, notified: staffList.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// n8n callback - roster check results
webhookRouter.post('/roster-check', async (req: Request, res: Response) => {
  console.log('[WEBHOOK] Roster check callback:', req.body);
  res.json({ received: true });
});
