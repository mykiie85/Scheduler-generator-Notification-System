import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NotificationPayload {
  type: string;
  channel: string;
  recipient: string;
  subject?: string;
  body: string;
}

export async function sendNotification(payload: NotificationPayload) {
  // Log the notification to database
  const notification = await prisma.notification.create({
    data: {
      type: payload.type,
      channel: payload.channel,
      recipient: payload.recipient,
      subject: payload.subject || null,
      body: payload.body,
      status: 'sent_stub',
      sentAt: new Date(),
    },
  });

  // Stub: Log to console instead of sending real notifications
  console.log(
    `[STUB NOTIFICATION] ${payload.channel} -> ${payload.recipient}: ${payload.subject || payload.body}`,
  );

  return notification;
}

export async function broadcastNotification(
  staffIds: string[],
  payload: Omit<NotificationPayload, 'recipient'>,
) {
  const staff = await prisma.staff.findMany({
    where: staffIds.length ? { id: { in: staffIds } } : { isActive: true },
    select: { phone: true, email: true, fullName: true },
  });

  const results = [];
  for (const s of staff) {
    const result = await sendNotification({
      ...payload,
      recipient: s.phone || s.email || s.fullName,
    });
    results.push(result);
  }
  return results;
}
