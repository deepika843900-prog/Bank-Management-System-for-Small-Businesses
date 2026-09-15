import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { authenticate, requireRole } from '../middleware/authMiddleware';

export const accountsRouter = Router();

// Require authentication for viewing accounts
accountsRouter.use(authenticate);

accountsRouter.get('/', (req: Request, res: Response) => {
  const accounts = BankingBackendService.getAccounts();
  const callerRole = req.user?.role;

  // Mask sensitive routing & full balances if unprivileged employee
  if (callerRole === 'EMPLOYEE') {
    const sanitized = accounts.map(acc => ({
      ...acc,
      routingNumber: '•••••••••',
      balance: acc.type === 'CHECKING' ? acc.balance : 0,
      availableBalance: acc.type === 'CHECKING' ? acc.availableBalance : 0
    }));
    return res.json({ success: true, data: sanitized });
  }

  res.json({ success: true, data: accounts });
});

accountsRouter.get('/:id', requireRole('ADMIN', 'ACCOUNTANT'), (req: Request, res: Response) => {
  const account = BankingBackendService.getAccountById(req.params.id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }
  res.json({ success: true, data: account });
});
