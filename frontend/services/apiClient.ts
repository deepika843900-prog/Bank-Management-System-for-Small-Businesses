import { 
  BankAccount, 
  Transaction, 
  UserProfile, 
  ExpenseClaim, 
  AuditLogEntry, 
  CloudBackupSnapshot,
  SecurityPostureMetrics,
  FinancialHealthMetrics
} from '../types';

export class BankingApiClient {
  private static baseUrl = '/api';

  private static getHeaders(activeUserId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const storedUserId = activeUserId || localStorage.getItem('sb_banking_current_user_id') || 'usr-admin-1';
    if (storedUserId) {
      headers['X-User-Id'] = storedUserId;
      headers['Authorization'] = `Bearer ${storedUserId}`;
    }

    return headers;
  }

  static async checkHealth(): Promise<{ status: string; system: string; version: string; securityPosture?: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  static async fetchAccounts(userId?: string): Promise<BankAccount[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/accounts`, {
        headers: this.getHeaders(userId)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async fetchTransactions(userId?: string): Promise<Transaction[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/transactions`, {
        headers: this.getHeaders(userId)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async recordTransaction(payload: {
    accountId: string;
    type: Transaction['type'];
    category: string;
    amount: number;
    counterparty: string;
    description: string;
    taxDeductible?: boolean;
    initiator?: UserProfile;
  }): Promise<{ transaction: Transaction; requiresDualAuth: boolean } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: this.getHeaders(payload.initiator?.id),
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async approveDualAuth(txId: string, approver: UserProfile): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/transactions/${txId}/approve-dual-auth`, {
        method: 'POST',
        headers: this.getHeaders(approver.id),
        body: JSON.stringify({ approverId: approver.id })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || (res.ok ? 'Approved' : 'Failed') };
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error' };
    }
  }

  static async rejectDualAuth(txId: string, reviewer: UserProfile, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/transactions/${txId}/reject-dual-auth`, {
        method: 'POST',
        headers: this.getHeaders(reviewer.id),
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || 'Rejected' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error' };
    }
  }

  static async fetchClaims(userId?: string): Promise<ExpenseClaim[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/claims`, {
        headers: this.getHeaders(userId)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async submitClaim(payload: {
    employee: UserProfile;
    title: string;
    category: ExpenseClaim['category'];
    amount: number;
    dateIncurred: string;
    description: string;
    receiptName?: string;
  }): Promise<ExpenseClaim | null> {
    try {
      const res = await fetch(`${this.baseUrl}/claims`, {
        method: 'POST',
        headers: this.getHeaders(payload.employee.id),
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async updateClaimStatus(
    claimId: string,
    status: ExpenseClaim['status'],
    reviewer: UserProfile,
    notes?: string
  ): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/claims/${claimId}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(reviewer.id),
        body: JSON.stringify({ status, notes })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async fetchSecurityMetrics(userId?: string): Promise<SecurityPostureMetrics | null> {
    try {
      const res = await fetch(`${this.baseUrl}/security/metrics`, {
        headers: this.getHeaders(userId)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async fetchAuditLogs(userId?: string): Promise<AuditLogEntry[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/security/audit-logs`, {
        headers: this.getHeaders(userId)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async recordAuditLog(log: { action: string; category: string; details: string; riskLevel: string }, userId?: string): Promise<AuditLogEntry | null> {
    try {
      const res = await fetch(`${this.baseUrl}/security/audit-logs`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify(log)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async verifyLedger(userId?: string): Promise<{ verified: boolean; tamperedCount: number; tamperedRecords?: string[]; recordCount: number; timestamp: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/security/verify-ledger`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify({})
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async toggleTamperSimulation(userId?: string): Promise<{ isTampered: boolean; tamperedCount: number; affectedRecord?: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/security/toggle-tamper-simulation`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify({})
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async fetchFinancialMetrics(userId?: string): Promise<FinancialHealthMetrics | null> {
    try {
      const res = await fetch(`${this.baseUrl}/analytics/financial-health`, {
        headers: this.getHeaders(userId)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async fetchBackups(userId?: string): Promise<CloudBackupSnapshot[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/backups`, {
        headers: this.getHeaders(userId)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async createCloudBackup(user: UserProfile): Promise<CloudBackupSnapshot | null> {
    try {
      const res = await fetch(`${this.baseUrl}/backups/snapshot`, {
        method: 'POST',
        headers: this.getHeaders(user.id),
        body: JSON.stringify({})
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async restoreBackup(id: string, user: UserProfile): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/backups/restore/${id}`, {
        method: 'POST',
        headers: this.getHeaders(user.id),
        body: JSON.stringify({})
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || (res.ok ? 'Restored' : 'Failed') };
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error' };
    }
  }

  static async updateUserLimits(targetUserId: string, limits: { spendingLimitMonthly?: number; twoFactorEnabled?: boolean }, adminUser: UserProfile): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/users/${targetUserId}/limits`, {
        method: 'PATCH',
        headers: this.getHeaders(adminUser.id),
        body: JSON.stringify(limits)
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
