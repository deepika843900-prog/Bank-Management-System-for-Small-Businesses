import { Router, Request, Response } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';

export const analyticsRouter = Router();

analyticsRouter.get('/financial-health', (req: Request, res: Response) => {
  const metrics = BankingBackendService.calculateFinancialHealth();
  res.json({ success: true, data: metrics });
});
