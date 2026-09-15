import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { TransactionType } from '../types';
import { authenticate, requireRole, rateLimiter } from '../middleware/authMiddleware';

export const transactionsRouter = Router();

// Apply session authentication across all transaction routes
transactionsRouter.use(authenticate);

// Get transactions: Employees can only view their own transactions, Admin & Accountant view all
transactionsRouter.get('/', (req: Request, res: Response) => {
  const allTx = BankingBackendService.getTransactions();
  const caller = req.user!;

  if (caller.role === 'EMPLOYEE') {
    const userTx = allTx.filter(t => t.initiatedByUserId === caller.id || t.counterparty.includes(caller.name));
    return res.json({ success: true, data: userTx });
  }

  res.json({ success: true, data: allTx });
});

// Record new transaction with strict input validation and rate limiting
transactionsRouter.post('/', rateLimiter({ windowMs: 60000, maxRequests: 20, endpointName: 'transaction_create' }), (req: Request, res: Response) => {
  const { accountId, type, category, amount, counterparty, description, taxDeductible } = req.body;
  const initiator = req.user!; // Derived securely from verified session

  // Strict field validation
  if (!accountId || typeof accountId !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid or missing accountId' });
  }

  const validTypes: TransactionType[] = [
    'PAYMENT_OUT', 'PAYMENT_IN', 'PAYROLL', 'WIRE_TRANSFER', 'VENDOR_INVOICE', 'TAX_ESCROW', 'REIMBURSEMENT'
  ];
  if (!type || !validTypes.includes(type as TransactionType)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing transaction type' });
  }

  // Prevent numeric injection, NaN, sub-cent precision, or extreme overflows
  const numAmount = Number(amount);
  if (typeof amount === 'undefined' || isNaN(numAmount) || !isFinite(numAmount) || Math.abs(numAmount) <= 0) {
    return res.status(400).json({ success: false, message: 'Transaction amount must be a non-zero finite number' });
  }

  // Prevent sub-cent manipulation
  const roundedAmount = Math.round(numAmount * 100) / 100;
  if (Math.abs(roundedAmount) > 10000000) {
    return res.status(400).json({ success: false, message: 'Amount exceeds maximum allowable transaction ceiling ($10,000,000)' });
  }

  // Check user monthly spending limit for outgoing transactions
  if (roundedAmount < 0 && initiator.role === 'EMPLOYEE') {
    const projectedSpend = initiator.currentMonthSpent + Math.abs(roundedAmount);
    if (projectedSpend > initiator.spendingLimitMonthly) {
      BankingBackendService.addAuditLog({
        userId: initiator.id,
        userName: initiator.name,
        userRole: initiator.role,
        action: 'SPENDING_LIMIT_BREACH_PREVENTED',
        category: 'RBAC',
        details: `Attempted $${Math.abs(roundedAmount)} transaction exceeds monthly ceiling of $${initiator.spendingLimitMonthly} (Spent: $${initiator.currentMonthSpent})`,
        ipAddress: req.ip || '127.0.0.1',
        riskLevel: 'MEDIUM',
        status: 'DENIED'
      });

      return res.status(403).json({
        success: false,
        code: 'SPENDING_LIMIT_EXCEEDED',
        message: `Transaction exceeds monthly limit of $${initiator.spendingLimitMonthly.toLocaleString()}. Current spent: $${initiator.currentMonthSpent.toLocaleString()}`
      });
    }
  }

  // Sanitize counterparty and description
  const cleanCounterparty = String(counterparty || '').trim().substring(0, 120);
  const cleanDescription = String(description || '').trim().substring(0, 250);

  if (!cleanCounterparty) {
    return res.status(400).json({ success: false, message: 'Counterparty name is required' });
  }

  const result = BankingBackendService.recordTransaction({
    accountId,
    type: type as TransactionType,
    category: String(category || 'Operating Expense').trim().substring(0, 60),
    amount: roundedAmount,
    counterparty: cleanCounterparty,
    description: cleanDescription,
    taxDeductible: Boolean(taxDeductible),
    initiator
  });

  res.status(201).json({ success: true, data: result });
});

// Approve dual-authorization: strictly ADMIN or ACCOUNTANT (with 4-eyes separation of duties)
transactionsRouter.post('/:id/approve-dual-auth', requireRole('ADMIN', 'ACCOUNTANT'), (req: Request, res: Response) => {
  const approver = req.user!; // Authenticated identity
  const result = BankingBackendService.approveDualAuthTransaction(req.params.id, approver);
  
  if (!result.success) {
    return res.status(403).json(result);
  }
  res.json(result);
});

// Reject dual-auth
transactionsRouter.post('/:id/reject-dual-auth', requireRole('ADMIN', 'ACCOUNTANT'), (req: Request, res: Response) => {
  const reviewer = req.user!;
  const reason = String(req.body.reason || 'Disapproved by treasury officer').trim().substring(0, 200);
  const result = BankingBackendService.rejectDualAuthTransaction(req.params.id, reviewer, reason);
  res.json(result);
});
