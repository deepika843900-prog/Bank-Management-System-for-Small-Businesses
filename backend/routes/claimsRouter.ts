import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { UserProfile, ExpenseClaim } from '../types';

export const claimsRouter = Router();

claimsRouter.get('/', (req: Request, res: Response) => {
  const claims = BankingBackendService.getExpenseClaims();
  res.json({ success: true, data: claims });
});

claimsRouter.post('/', (req: Request, res: Response) => {
  const { employee, title, category, amount, dateIncurred, description, receiptName } = req.body;
  if (!employee || !title || !amount) {
    return res.status(400).json({ success: false, message: 'Missing required claim fields' });
  }

  const newClaim = BankingBackendService.submitExpenseClaim({
    employee: employee as UserProfile,
    title,
    category: category || 'OTHER',
    amount: Number(amount),
    dateIncurred: dateIncurred || new Date().toISOString().substring(0, 10),
    description: description || '',
    receiptName
  });

  res.status(201).json({ success: true, data: newClaim });
});

claimsRouter.patch('/:id/status', (req: Request, res: Response) => {
  const { status, reviewer, notes } = req.body;
  if (!status || !reviewer) {
    return res.status(400).json({ success: false, message: 'Status and reviewer are required' });
  }

  const updated = BankingBackendService.updateClaimStatus(
    req.params.id,
    status as ExpenseClaim['status'],
    reviewer as UserProfile,
    notes
  );

  if (!updated) {
    return res.status(404).json({ success: false, message: 'Claim not found' });
  }

  res.json({ success: true, message: `Claim updated to ${status}` });
});
