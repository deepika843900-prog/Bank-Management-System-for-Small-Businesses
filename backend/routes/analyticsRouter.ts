import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { authenticate, requireRole } from '../middleware/authMiddleware';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

// Financial health metrics: ADMIN and ACCOUNTANT
analyticsRouter.get('/financial-health', requireRole('ADMIN', 'ACCOUNTANT'), (req: Request, res: Response) => {
  const metrics = BankingBackendService.calculateFinancialHealth();
  res.json({ success: true, data: metrics });
});
