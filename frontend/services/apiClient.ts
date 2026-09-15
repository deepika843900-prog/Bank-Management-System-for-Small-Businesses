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

  static async checkHealth(): Promise<{ status: string; system: string; version: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  static async fetchAccounts(): Promise<BankAccount[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/accounts`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async fetchTransactions(): Promise<Transaction[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/transactions`);
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
    initiator: UserProfile;
  }): Promise<{ transaction: Transaction; requiresDualAuth: boolean } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async approveDualAuth(txId: string, approver: UserProfile): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/transactions/${txId}/approve-dual-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async rejectDualAuth(txId: string, reviewer: UserProfile, reason: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/transactions/${txId}/reject-dual-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer, reason })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async fetchClaims(): Promise<ExpenseClaim[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/claims`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async fetchSecurityMetrics(): Promise<SecurityPostureMetrics | null> {
    try {
      const res = await fetch(`${this.baseUrl}/security/metrics`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  static async fetchFinancialMetrics(): Promise<FinancialHealthMetrics | null> {
    try {
      const res = await fetch(`${this.baseUrl}/analytics/financial-health`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }
}
