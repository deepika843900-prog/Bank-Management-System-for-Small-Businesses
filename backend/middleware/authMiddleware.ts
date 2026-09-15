import { Request, Response, NextFunction } from 'express';
import { BankingBackendService } from '../services/bankingBackendService';
import { UserProfile, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

/**
 * Authentication Middleware:
 * Validates the caller identity via session headers (X-User-Id or Bearer token).
 * Strictly binds request.user to an authorized server-validated profile.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Extract user ID from header (X-User-Id or Authorization: Bearer <userId>)
  let userId = req.header('x-user-id');
  const authHeader = req.header('authorization');
  
  if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.substring(7).trim();
  }

  // If none specified, fall back to current active server session user
  if (!userId) {
    const defaultUser = BankingBackendService.getCurrentUser();
    if (defaultUser && defaultUser.status === 'ACTIVE') {
      req.user = defaultUser;
      return next();
    }
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required. Missing X-User-Id or Bearer token.'
    });
  }

  const user = BankingBackendService.getUserById(userId);
  if (!user) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid user session or user not found.'
    });
  }

  if (user.status !== 'ACTIVE') {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_LOCKED',
      message: `Account is ${user.status}. Access denied.`
    });
  }

  req.user = user;
  next();
}

/**
 * Role-Based Access Control (RBAC) Guard Middleware:
 * Enforces role clearance on sensitive operations.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      BankingBackendService.addAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'RBAC_ACCESS_VIOLATION_BLOCKED',
        category: 'RBAC',
        details: `Access denied to ${req.method} ${req.originalUrl}. Required: [${allowedRoles.join(', ')}], Caller: ${req.user.role}`,
        ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
        riskLevel: 'HIGH',
        status: 'DENIED'
      });

      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        message: `Forbidden: This operation requires one of [${allowedRoles.join(', ')}] clearance.`
      });
    }

    next();
  };
}

/**
 * Rate Limiting Memory Guard Middleware:
 * Throttles rapid brute-force requests and DoS vectors on sensitive endpoints.
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(options: { windowMs: number; maxRequests: number; endpointName: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'ip'}_${options.endpointName}_${req.user?.id || 'anon'}`;
    const now = Date.now();
    const current = requestCounts.get(key);

    if (!current || now > current.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    current.count++;
    if (current.count > options.maxRequests) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests for ${options.endpointName}. Please wait a moment before retrying.`
      });
    }

    next();
  };
}
