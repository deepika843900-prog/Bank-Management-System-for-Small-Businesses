import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';

export const usersRouter = Router();

usersRouter.get('/', (req: Request, res: Response) => {
  const users = BankingBackendService.getUsers();
  res.json({ success: true, data: users });
});

usersRouter.get('/current', (req: Request, res: Response) => {
  const user = BankingBackendService.getCurrentUser();
  res.json({ success: true, data: user });
});

usersRouter.post('/current', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required' });
  }
  BankingBackendService.setCurrentUserId(userId);
  const user = BankingBackendService.getCurrentUser();
  res.json({ success: true, data: user });
});

usersRouter.patch('/:id/limits', (req: Request, res: Response) => {
  const { spendingLimitMonthly, twoFactorEnabled } = req.body;
  const updated = BankingBackendService.updateUserLimits(req.params.id, {
    spendingLimitMonthly,
    twoFactorEnabled
  });

  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({ success: true, message: 'User updated successfully' });
});
