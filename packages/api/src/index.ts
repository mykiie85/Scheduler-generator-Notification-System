import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { staffRouter } from './routes/staff.js';
import { rosterRouter } from './routes/rosters.js';
import { allocationRouter } from './routes/allocations.js';
import { holidayRouter } from './routes/holidays.js';
import { eventRouter } from './routes/events.js';
import { announcementRouter } from './routes/announcements.js';
import { leaveRouter } from './routes/leave.js';
import { userRouter } from './routes/users.js';
import { mcpRouter } from './routes/mcp.js';
import { webhookRouter } from './routes/webhook.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/staff', staffRouter);
app.use('/api/rosters', rosterRouter);
app.use('/api/allocations', allocationRouter);
app.use('/api/holidays', holidayRouter);
app.use('/api/events', eventRouter);
app.use('/api/announcements', announcementRouter);
app.use('/api/leave', leaveRouter);
app.use('/api/users', userRouter);
app.use('/api/mcp', mcpRouter);
app.use('/api/webhook', webhookRouter);

// Stub endpoints for notification services
app.post('/api/stub/whatsapp', (_req, res) => {
  console.log('[STUB] WhatsApp message sent:', _req.body);
  res.json({ success: true, stub: true });
});
app.post('/api/stub/sms', (_req, res) => {
  console.log('[STUB] SMS sent:', _req.body);
  res.json({ success: true, stub: true });
});

app.listen(config.port, () => {
  console.log(`Lab Scheduler API running on port ${config.port}`);
});

export default app;
