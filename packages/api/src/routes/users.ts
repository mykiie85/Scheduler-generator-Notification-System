import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
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
        email: true,
        fullName: true,
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
