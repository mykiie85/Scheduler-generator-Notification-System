import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const prisma = new PrismaClient();
export const userRouter = Router();

userRouter.use(authMiddleware);

// List all users (admin only)
userRouter.get('/', requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fileNo: true,
        email: true,
        fullName: true,
        phone: true,
        title: true,
        role: true,
        approvalStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (admin only)
userRouter.post('/', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      fileNo: z.string().optional(),
      email: z.string().email(),
      fullName: z.string().min(2),
      phone: z.string().optional(),
      title: z.string().optional(),
      role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']).default('MANAGER'),
      password: z.string().min(6).default('LabScheduler2026!'),
    }).parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        fileNo: data.fileNo,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        title: data.title,
        role: data.role,
        passwordHash,
        approvalStatus: 'APPROVED',
      },
      select: { id: true, fileNo: true, email: true, fullName: true, phone: true, title: true, role: true, approvalStatus: true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
userRouter.put('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      fileNo: z.string().optional(),
      email: z.string().email().optional(),
      fullName: z.string().min(2).optional(),
      phone: z.string().optional(),
      title: z.string().optional(),
      role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']).optional(),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, fileNo: true, email: true, fullName: true, phone: true, title: true, role: true, approvalStatus: true },
    });
    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Approve user (admin only)
userRouter.put('/:id/approve', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { approvalStatus: 'APPROVED' },
      select: { id: true, email: true, fullName: true, role: true, approvalStatus: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Reject user (admin only)
userRouter.put('/:id/reject', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { approvalStatus: 'REJECTED' },
      select: { id: true, email: true, fullName: true, role: true, approvalStatus: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

// Update user role (admin only)
userRouter.put('/:id/role', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { role } = z.object({ role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']) }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, fullName: true, role: true, approvalStatus: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Get current user profile
userRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, fullName: true, role: true, approvalStatus: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
userRouter.put('/me', async (req: Request, res: Response) => {
  try {
    const data = z.object({ fullName: z.string().optional(), email: z.string().email().optional() }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: { id: true, email: true, fullName: true, role: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete user (admin only)
userRouter.delete('/:id', requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
