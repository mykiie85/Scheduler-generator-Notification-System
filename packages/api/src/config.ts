import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.API_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://labuser:labpass@localhost:5432/labscheduler',
  },
  webhooks: {
    weeklyAllocationUrl: process.env.N8N_WEEKLY_ALLOCATION_WEBHOOK_URL || '',
    holidayUrl: process.env.N8N_HOLIDAY_WEBHOOK_URL || '',
    eventUrl: process.env.N8N_EVENT_WEBHOOK_URL || '',
    announcementUrl: process.env.N8N_ANNOUNCEMENT_WEBHOOK_URL || '',
  },
};
