import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!config.n8n.webhookApiKey) {
    res.status(500).json({ error: 'Webhook API key not configured' });
    return;
  }

  if (!apiKey || apiKey !== config.n8n.webhookApiKey) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }

  next();
}
