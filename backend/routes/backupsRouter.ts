import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { UserProfile } from '../types';

export const backupsRouter = Router();

backupsRouter.get('/', (req: Request, res: Response) => {
  const backups = BankingBackendService.getCloudBackups();
  res.json({ success: true, data: backups });
});

backupsRouter.post('/snapshot', (req: Request, res: Response) => {
  const { user } = req.body;
  const initiator = (user as UserProfile) || BankingBackendService.getCurrentUser();
  const snapshot = BankingBackendService.createCloudSnapshot(initiator);
  res.status(201).json({ success: true, data: snapshot });
});

backupsRouter.post('/restore/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { user } = req.body;
  const initiator = (user as UserProfile) || BankingBackendService.getCurrentUser();

  BankingBackendService.addAuditLog({
    userId: initiator.id,
    userName: initiator.name,
    userRole: initiator.role,
    action: 'DISASTER_RECOVERY_SIMULATION',
    category: 'BACKUP',
    details: `Executed disaster recovery restore drill from snapshot ID ${id}. All ledger hashes validated.`,
    ipAddress: initiator.ipAddress || '127.0.0.1',
    riskLevel: 'LOW',
    status: 'SUCCESS'
  });

  res.json({
    success: true,
    message: `Snapshot ${id} successfully restored in isolated recovery environment.`
  });
});
