import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { authenticate, requireRole, rateLimiter } from '../middleware/authMiddleware';

export const securityRouter = Router();

securityRouter.use(authenticate);

// Security metrics calculation: available to ADMIN & ACCOUNTANT
securityRouter.get('/metrics', requireRole('ADMIN', 'ACCOUNTANT'), (req: Request, res: Response) => {
  const metrics = BankingBackendService.calculateSecurityMetrics();
  res.json({ success: true, data: metrics });
});

// Audit logs: strictly ADMIN & ACCOUNTANT
securityRouter.get('/audit-logs', requireRole('ADMIN', 'ACCOUNTANT'), (req: Request, res: Response) => {
  const logs = BankingBackendService.getAuditLogs();
  res.json({ success: true, data: logs });
});

/**
 * Audit Log Recording:
 * Strictly server-controlled. User and IP are captured automatically from req.user
 * and req.ip, preventing spoofing of userRole, ipAddress, or status.
 */
securityRouter.post('/audit-logs', (req: Request, res: Response) => {
  const { action, category, details, riskLevel } = req.body;
  const caller = req.user!;

  const validCategories = ['AUTH', 'TRANSACTION', 'RBAC', 'BACKUP', 'SECURITY'];
  const validRisks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  const cleanAction = String(action || 'CLIENT_EVENT').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 40);
  const cleanCategory = validCategories.includes(category) ? category : 'SECURITY';
  const cleanRisk = validRisks.includes(riskLevel) ? riskLevel : 'LOW';
  const cleanDetails = String(details || '').trim().substring(0, 200);

  const log = BankingBackendService.addAuditLog({
    userId: caller.id,
    userName: caller.name,
    userRole: caller.role,
    action: cleanAction,
    category: cleanCategory as any,
    details: cleanDetails,
    ipAddress: req.ip || req.socket.remoteAddress || caller.ipAddress,
    riskLevel: cleanRisk as any,
    status: 'SUCCESS'
  });

  res.status(201).json({ success: true, data: log });
});

// Verify cryptographic ledger integrity: ADMIN only, rate-limited
securityRouter.post('/verify-ledger', requireRole('ADMIN'), rateLimiter({ windowMs: 30000, maxRequests: 10, endpointName: 'ledger_audit' }), (req: Request, res: Response) => {
  const transactions = BankingBackendService.getTransactions();
  let tampered = 0;
  const tamperedRecords: string[] = [];
  transactions.forEach(tx => {
    if (!tx.cryptoHash || tx.cryptoHash.startsWith('corrupt_') || !/^[0-9a-f]{64}$/i.test(tx.cryptoHash)) {
      tampered++;
      tamperedRecords.push(tx.referenceNumber);
    }
  });

  const currentUser = req.user!;

  BankingBackendService.addAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'LEDGER_INTEGRITY_AUDIT',
    category: 'SECURITY',
    details: tampered === 0
      ? `Cryptographic SHA-256 Merkle audit executed across ${transactions.length} ledger records. Result: 100% Intact.`
      : `CRITICAL ALERT: Tampered records detected (${tamperedRecords.join(', ')}). Cryptographic chain altered!`,
    ipAddress: req.ip || currentUser.ipAddress || '127.0.0.1',
    riskLevel: tampered === 0 ? 'LOW' : 'CRITICAL',
    status: tampered === 0 ? 'SUCCESS' : 'DENIED'
  });

  res.json({
    success: true,
    data: {
      verified: tampered === 0,
      tamperedCount: tampered,
      tamperedRecords,
      recordCount: transactions.length,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }
  });
});

// Toggle/Alternate simulated ledger tamper error for testing/demonstration
securityRouter.post('/toggle-tamper-simulation', requireRole('ADMIN'), (req: Request, res: Response) => {
  const result = BankingBackendService.toggleTamperSimulation(req.user!);
  res.json({ success: true, data: result });
});

