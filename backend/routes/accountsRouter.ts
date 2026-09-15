import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';

export const accountsRouter = Router();

accountsRouter.get('/', (req: Request, res: Response) => {
  const accounts = BankingBackendService.getAccounts();
  res.json({ success: true, data: accounts });
});

accountsRouter.get('/:id', (req: Request, res: Response) => {
  const account = BankingBackendService.getAccountById(req.params.id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }
  res.json({ success: true, data: account });
});
