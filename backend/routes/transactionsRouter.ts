import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { UserProfile } from '../types';

export const transactionsRouter = Router();

transactionsRouter.get('/', (req: Request, res: Response) => {
  const transactions = BankingBackendService.getTransactions();
  res.json({ success: true, data: transactions });
});

transactionsRouter.post('/', (req: Request, res: Response) => {
  const { accountId, type, category, amount, counterparty, description, taxDeductible, initiator } = req.body;
  if (!accountId || !type || !amount || !counterparty || !initiator) {
    return res.status(400).json({ success: false, message: 'Missing required transaction fields' });
  }

  const result = BankingBackendService.recordTransaction({
    accountId,
    type,
    category: category || 'Operating Expense',
    amount: Number(amount),
    counterparty,
    description: description || '',
    taxDeductible: Boolean(taxDeductible),
    initiator: initiator as UserProfile
  });

  res.status(201).json({ success: true, data: result });
});

transactionsRouter.post('/:id/approve-dual-auth', (req: Request, res: Response) => {
  const { approver } = req.body;
  if (!approver) {
    return res.status(400).json({ success: false, message: 'Approver profile is required' });
  }

  const result = BankingBackendService.approveDualAuthTransaction(req.params.id, approver as UserProfile);
  if (!result.success) {
    return res.status(403).json(result);
  }
  res.json(result);
});

transactionsRouter.post('/:id/reject-dual-auth', (req: Request, res: Response) => {
  const { reviewer, reason } = req.body;
  if (!reviewer) {
    return res.status(400).json({ success: false, message: 'Reviewer profile is required' });
  }

  const result = BankingBackendService.rejectDualAuthTransaction(req.params.id, reviewer as UserProfile, reason || 'Disapproved by treasury executive');
  res.json(result);
});
