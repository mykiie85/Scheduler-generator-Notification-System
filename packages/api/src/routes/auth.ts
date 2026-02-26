import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';

const prisma = new PrismaClient();
export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName },
      select: { id: true, email: true, fullName: true, role: true, approvalStatus: true },
    });
    res.status(201).json({ user, message: 'Account created. Awaiting admin approval.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    if (user.approvalStatus !== 'APPROVED') {
      res.status(403).json({ error: 'Account not yet approved by admin' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn },
    );
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      res.json({ message: 'If the email exists, a reset link has been sent.' });
      return;
    }
    // Stub: In production, send reset email
    const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, config.jwt.secret, {
      expiresIn: '1h',
    });
    console.log(`[STUB] Password reset token for ${email}: ${resetToken}`);
    res.json({ message: 'If the email exists, a reset link has been sent.', _devToken: resetToken });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(500).json({ error: 'Request failed' });
  }
});

authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = z
      .object({ token: z.string(), newPassword: z.string().min(6) })
      .parse(req.body);
    const payload = jwt.verify(token, config.jwt.secret) as { userId: string; purpose: string };
    if (payload.purpose !== 'reset') {
      res.status(400).json({ error: 'Invalid reset token' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: payload.userId }, data: { passwordHash } });
    res.json({ message: 'Password reset successfully' });
  } catch {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});
