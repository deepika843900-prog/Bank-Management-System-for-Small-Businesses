import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { authenticate, requireRole } from '../middleware/authMiddleware';

export const usersRouter = Router();

usersRouter.use(authenticate);

// List users: unprivileged employees receive sanitized directory (no private limits or login IPs)
usersRouter.get('/', (req: Request, res: Response) => {
  const users = BankingBackendService.getUsers();
  const caller = req.user!;

  if (caller.role === 'EMPLOYEE') {
    const sanitized = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      status: u.status
    }));
    return res.json({ success: true, data: sanitized });
  }

  res.json({ success: true, data: users });
});

// Get current session user
usersRouter.get('/current', (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});

// Switch session identity
usersRouter.post('/current', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ success: false, message: 'userId is required' });
  }

  const target = BankingBackendService.getUserById(userId);
  if (!target) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  BankingBackendService.setCurrentUserId(userId);
  const updatedUser = BankingBackendService.getCurrentUser();
  res.json({ success: true, data: updatedUser });
});

// Update spending limits or 2FA: strictly ADMIN
usersRouter.patch('/:id/limits', requireRole('ADMIN'), (req: Request, res: Response) => {
  const { spendingLimitMonthly, twoFactorEnabled } = req.body;

  let validatedLimit: number | undefined = undefined;
  if (spendingLimitMonthly !== undefined) {
    const num = Number(spendingLimitMonthly);
    if (isNaN(num) || !isFinite(num) || num < 0 || num > 1000000) {
      return res.status(400).json({ success: false, message: 'Invalid spending limit amount ($0 - $1,000,000)' });
    }
    validatedLimit = num;
  }

  const updated = BankingBackendService.updateUserLimits(req.params.id, {
    spendingLimitMonthly: validatedLimit,
    twoFactorEnabled: typeof twoFactorEnabled === 'boolean' ? twoFactorEnabled : undefined
  });

  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  BankingBackendService.addAuditLog({
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: 'USER_LIMITS_MODIFIED',
    category: 'RBAC',
    details: `Admin updated limits/2FA for user ID ${req.params.id}`,
    ipAddress: req.ip || '127.0.0.1',
    riskLevel: 'MEDIUM',
    status: 'SUCCESS'
  });

  res.json({ success: true, message: 'User limits updated successfully' });
});
