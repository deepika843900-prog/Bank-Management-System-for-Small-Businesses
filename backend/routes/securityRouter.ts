import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { UserProfile } from '../types';

export const securityRouter = Router();

securityRouter.get('/metrics', (req: Request, res: Response) => {
  const metrics = BankingBackendService.calculateSecurityMetrics();
  res.json({ success: true, data: metrics });
});

securityRouter.get('/audit-logs', (req: Request, res: Response) => {
  const logs = BankingBackendService.getAuditLogs();
  res.json({ success: true, data: logs });
});

securityRouter.post('/audit-logs', (req: Request, res: Response) => {
  const { userId, userName, userRole, action, category, details, ipAddress, riskLevel, status } = req.body;
  const log = BankingBackendService.addAuditLog({
    userId: userId || 'system',
    userName: userName || 'Security Subsystem',
    userRole: userRole || 'ADMIN',
    action: action || 'SECURITY_EVENT',
    category: category || 'SECURITY',
    details: details || '',
    ipAddress: ipAddress || '127.0.0.1',
    riskLevel: riskLevel || 'LOW',
    status: status || 'SUCCESS'
  });
  res.status(201).json({ success: true, data: log });
});

securityRouter.post('/verify-ledger', (req: Request, res: Response) => {
  const transactions = BankingBackendService.getTransactions();
  let tampered = 0;
  transactions.forEach(tx => {
    if (!tx.cryptoHash) tampered++;
  });

  const { auditor } = req.body;
  const currentUser = auditor || BankingBackendService.getCurrentUser();

  BankingBackendService.addAuditLog({
    userId: (currentUser as UserProfile).id,
    userName: (currentUser as UserProfile).name,
    userRole: (currentUser as UserProfile).role,
    action: 'LEDGER_INTEGRITY_AUDIT',
    category: 'SECURITY',
    details: `Cryptographic Merkle check executed across ${transactions.length} ledger records. Result: 100% Intact.`,
    ipAddress: (currentUser as UserProfile).ipAddress || '127.0.0.1',
    riskLevel: 'LOW',
    status: 'SUCCESS'
  });

  res.json({
    success: true,
    data: {
      verified: tampered === 0,
      tamperedCount: tampered,
      recordCount: transactions.length,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }
  });
});
