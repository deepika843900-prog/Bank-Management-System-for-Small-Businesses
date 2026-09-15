import express, { Express } from 'express';
import { accountsRouter } from './routes/accountsRouter';
import { transactionsRouter } from './routes/transactionsRouter';
import { claimsRouter } from './routes/claimsRouter';
import { usersRouter } from './routes/usersRouter';
import { securityRouter } from './routes/securityRouter';
import { backupsRouter } from './routes/backupsRouter';
import { analyticsRouter } from './routes/analyticsRouter';

export function createBackendApp(): Express {
  const app = express();

  app.use(express.json());

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'Small Business & MNVC Banking System API',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // API Routers
  app.use('/api/accounts', accountsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/claims', claimsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/security', securityRouter);
  app.use('/api/backups', backupsRouter);
  app.use('/api/analytics', analyticsRouter);

  return app;
}
