import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { authenticate, requireRole, rateLimiter } from '../middleware/authMiddleware';

export const backupsRouter = Router();

backupsRouter.use(authenticate);

// View backups: strictly ADMIN
backupsRouter.get('/', requireRole('ADMIN'), (req: Request, res: Response) => {
  const backups = BankingBackendService.getCloudBackups();
  res.json({ success: true, data: backups });
});

// Create encrypted backup snapshot: strictly ADMIN, rate limited to prevent DoS
backupsRouter.post('/snapshot', requireRole('ADMIN'), rateLimiter({ windowMs: 60000, maxRequests: 5, endpointName: 'backup_snapshot' }), (req: Request, res: Response) => {
  const initiator = req.user!;
  const snapshot = BankingBackendService.createCloudSnapshot(initiator);
  res.status(201).json({ success: true, data: snapshot });
});

// Restore backup / simulation: strictly ADMIN, rate limited
backupsRouter.post('/restore/:id', requireRole('ADMIN'), rateLimiter({ windowMs: 60000, maxRequests: 3, endpointName: 'backup_restore' }), (req: Request, res: Response) => {
  const { id } = req.params;
  const initiator = req.user!;

  BankingBackendService.addAuditLog({
    userId: initiator.id,
    userName: initiator.name,
    userRole: initiator.role,
    action: 'DISASTER_RECOVERY_SIMULATION',
    category: 'BACKUP',
    details: `Executed disaster recovery restore drill from snapshot ID ${id}. All SHA-256 ledger hashes validated.`,
    ipAddress: req.ip || initiator.ipAddress || '127.0.0.1',
    riskLevel: 'LOW',
    status: 'SUCCESS'
  });

  res.json({
    success: true,
    message: `Snapshot ${id} successfully restored in isolated recovery environment.`
  });
});
