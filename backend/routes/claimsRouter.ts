import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { ExpenseClaim } from '../types';
import { authenticate, requireRole } from '../middleware/authMiddleware';

export const claimsRouter = Router();

claimsRouter.use(authenticate);

// Get claims: Employees see only their own, Admin/Accountant see all
claimsRouter.get('/', (req: Request, res: Response) => {
  const claims = BankingBackendService.getExpenseClaims();
  const caller = req.user!;

  if (caller.role === 'EMPLOYEE') {
    const userClaims = claims.filter(c => c.employeeId === caller.id);
    return res.json({ success: true, data: userClaims });
  }

  res.json({ success: true, data: claims });
});

// Submit claim: bound directly to authenticated user session
claimsRouter.post('/', (req: Request, res: Response) => {
  const { title, category, amount, dateIncurred, description, receiptName } = req.body;
  const employee = req.user!; // Authenticated identity

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Claim title is required' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid positive expense amount is required' });
  }

  const roundedAmount = Math.round(numAmount * 100) / 100;
  if (roundedAmount > 25000) {
    return res.status(400).json({ success: false, message: 'Single expense claim cannot exceed $25,000' });
  }

  const cleanTitle = title.trim().substring(0, 100);
  const cleanDescription = String(description || '').trim().substring(0, 300);
  const cleanReceiptName = receiptName ? String(receiptName).replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 80) : 'receipt.pdf';

  const newClaim = BankingBackendService.submitExpenseClaim({
    employee,
    title: cleanTitle,
    category: category || 'OTHER',
    amount: roundedAmount,
    dateIncurred: dateIncurred || new Date().toISOString().substring(0, 10),
    description: cleanDescription,
    receiptName: cleanReceiptName
  });

  res.status(201).json({ success: true, data: newClaim });
});

// Update status: strictly Admin or Accountant
claimsRouter.patch('/:id/status', requireRole('ADMIN', 'ACCOUNTANT'), (req: Request, res: Response) => {
  const { status, notes } = req.body;
  const reviewer = req.user!;

  const validStatuses = ['SUBMITTED', 'ACCOUNTANT_REVIEW', 'APPROVED', 'DISBURSED', 'REJECTED'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid claim status' });
  }

  const cleanNotes = notes ? String(notes).trim().substring(0, 200) : undefined;

  const updated = BankingBackendService.updateClaimStatus(
    req.params.id,
    status as ExpenseClaim['status'],
    reviewer,
    cleanNotes
  );

  if (!updated) {
    return res.status(404).json({ success: false, message: 'Claim not found' });
  }

  res.json({ success: true, message: `Claim updated to ${status}` });
});
