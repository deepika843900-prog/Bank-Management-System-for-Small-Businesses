import express, { Express, Request, Response, NextFunction } from 'express';
import { accountsRouter } from './routes/accountsRouter';
import { transactionsRouter } from './routes/transactionsRouter';
import { claimsRouter } from './routes/claimsRouter';
import { usersRouter } from './routes/usersRouter';
import { securityRouter } from './routes/securityRouter';
import { backupsRouter } from './routes/backupsRouter';
import { analyticsRouter } from './routes/analyticsRouter';

export function createBackendApp(): Express {
  const app = express();

  // Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.removeHeader('X-Powered-By');
    next();
  });

  // Limit request payload sizes to prevent memory flooding
  app.use(express.json({ limit: '500kb' }));

  // Health endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      system: 'Apex Commercial Banking Core API',
      version: '2.1.0-hardened',
      securityPosture: 'HARDENED_RBAC_ACTIVE',
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

  // Centralized Error Handling
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    res.status(err.status || 500).json({
      success: false,
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.'
    });
  });

  return app;
}
