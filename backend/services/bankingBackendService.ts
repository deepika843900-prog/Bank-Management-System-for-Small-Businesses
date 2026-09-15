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
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_USERS, 
  INITIAL_EXPENSE_CLAIMS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_CLOUD_BACKUPS 
} from '../data/initialData';

export function generateCryptoHash(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}${Date.now().toString(16).slice(-6)}`;
}

export class BankingBackendService {
  private static accounts: BankAccount[] = [...INITIAL_ACCOUNTS];
  private static transactions: Transaction[] = [...INITIAL_TRANSACTIONS];
  private static users: UserProfile[] = [...INITIAL_USERS];
  private static claims: ExpenseClaim[] = [...INITIAL_EXPENSE_CLAIMS];
  private static auditLogs: AuditLogEntry[] = [...INITIAL_AUDIT_LOGS];
  private static backups: CloudBackupSnapshot[] = [...INITIAL_CLOUD_BACKUPS];
  private static currentUserId: string = 'usr-admin-1';

  // Accounts
  static getAccounts(): BankAccount[] {
    return this.accounts;
  }

  static getAccountById(id: string): BankAccount | undefined {
    return this.accounts.find(a => a.id === id);
  }

  // Transactions
  static getTransactions(): Transaction[] {
    return this.transactions;
  }

  static recordTransaction(data: {
    accountId: string;
    type: Transaction['type'];
    category: string;
    amount: number;
    counterparty: string;
    description: string;
    taxDeductible?: boolean;
    initiator: UserProfile;
  }): { transaction: Transaction; requiresDualAuth: boolean } {
    const account = this.accounts.find(a => a.id === data.accountId) || this.accounts[0];
    const isHighValue = Math.abs(data.amount) >= 10000;
    const requiresDualAuth = isHighValue && data.amount < 0;

    const payloadString = `${data.accountId}:${data.amount}:${data.counterparty}:${Date.now()}`;
    const cryptoHash = generateCryptoHash(payloadString);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      referenceNumber: `TX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      accountId: account.id,
      accountName: account.name,
      type: data.type,
      category: data.category,
      amount: data.amount,
      currency: 'USD',
      counterparty: data.counterparty,
      description: data.description,
      status: requiresDualAuth ? 'PENDING_DUAL_AUTH' : 'COMPLETED',
      initiatedByUserId: data.initiator.id,
      initiatedByName: data.initiator.name,
      dualAuthRequired: requiresDualAuth,
      taxDeductible: data.taxDeductible ?? false,
      cryptoHash
    };

    if (!requiresDualAuth) {
      account.balance += data.amount;
      account.availableBalance += data.amount;
    }

    this.transactions = [newTx, ...this.transactions];

    this.addAuditLog({
      userId: data.initiator.id,
      userName: data.initiator.name,
      userRole: data.initiator.role,
      action: requiresDualAuth ? 'TRANSACTION_DUAL_AUTH_TRIGGERED' : 'TRANSACTION_SETTLED',
      category: 'TRANSACTION',
      details: `${requiresDualAuth ? 'Pending 4-eyes dual authorization for' : 'Settled'} ${data.amount < 0 ? '-' : '+'}$${Math.abs(data.amount).toLocaleString()} to ${data.counterparty} (${data.category})`,
      ipAddress: data.initiator.ipAddress,
      riskLevel: requiresDualAuth ? 'MEDIUM' : 'LOW',
      status: 'SUCCESS'
    });

    return { transaction: newTx, requiresDualAuth };
  }

  static approveDualAuthTransaction(txId: string, approver: UserProfile): { success: boolean; message: string } {
    const tx = this.transactions.find(t => t.id === txId);
    if (!tx) return { success: false, message: 'Transaction not found' };
    if (tx.status !== 'PENDING_DUAL_AUTH') return { success: false, message: 'Transaction is not pending dual auth' };

    // Separation of duties rule
    if (tx.initiatedByUserId === approver.id) {
      this.addAuditLog({
        userId: approver.id,
        userName: approver.name,
        userRole: approver.role,
        action: 'DUAL_AUTH_SELF_APPROVAL_BLOCKED',
        category: 'RBAC',
        details: `Separation of Duties violation: Initiator attempted to self-approve transaction ${tx.referenceNumber}`,
        ipAddress: approver.ipAddress,
        riskLevel: 'HIGH',
        status: 'DENIED'
      });
      return { success: false, message: 'Separation of duties violation: Initiator cannot approve their own high-value wire.' };
    }

    tx.status = 'COMPLETED';
    tx.approvedByUserId = approver.id;
    tx.approvedByName = approver.name;

    const acc = this.accounts.find(a => a.id === tx.accountId);
    if (acc) {
      acc.balance += tx.amount;
      acc.availableBalance += tx.amount;
    }

    this.addAuditLog({
      userId: approver.id,
      userName: approver.name,
      userRole: approver.role,
      action: 'DUAL_AUTH_APPROVED',
      category: 'TRANSACTION',
      details: `Dual-control authorization granted for ${tx.referenceNumber} ($${Math.abs(tx.amount).toLocaleString()} to ${tx.counterparty})`,
      ipAddress: approver.ipAddress,
      riskLevel: 'LOW',
      status: 'SUCCESS'
    });

    return { success: true, message: 'Transaction approved and settled successfully.' };
  }

  static rejectDualAuthTransaction(txId: string, reviewer: UserProfile, reason: string): { success: boolean; message: string } {
    const tx = this.transactions.find(t => t.id === txId);
    if (!tx) return { success: false, message: 'Transaction not found' };

    tx.status = 'REJECTED';

    this.addAuditLog({
      userId: reviewer.id,
      userName: reviewer.name,
      userRole: reviewer.role,
      action: 'DUAL_AUTH_REJECTED',
      category: 'TRANSACTION',
      details: `Rejected transaction ${tx.referenceNumber}. Reason: ${reason}`,
      ipAddress: reviewer.ipAddress,
      riskLevel: 'MEDIUM',
      status: 'SUCCESS'
    });

    return { success: true, message: 'Transaction marked as rejected.' };
  }

  // Expense Claims
  static getExpenseClaims(): ExpenseClaim[] {
    return this.claims;
  }

  static submitExpenseClaim(data: {
    employee: UserProfile;
    title: string;
    category: ExpenseClaim['category'];
    amount: number;
    dateIncurred: string;
    description: string;
    receiptName?: string;
  }): ExpenseClaim {
    const newClaim: ExpenseClaim = {
      id: `clm-${Date.now()}`,
      claimNumber: `CLM-2026-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: data.employee.id,
      employeeName: data.employee.name,
      employeeEmail: data.employee.email,
      department: data.employee.department,
      title: data.title,
      category: data.category,
      amount: data.amount,
      currency: 'USD',
      dateIncurred: data.dateIncurred,
      submissionDate: new Date().toISOString().substring(0, 10),
      description: data.description,
      status: 'SUBMITTED',
      receiptName: data.receiptName || 'receipt_attachment.pdf'
    };

    this.claims = [newClaim, ...this.claims];

    this.addAuditLog({
      userId: data.employee.id,
      userName: data.employee.name,
      userRole: data.employee.role,
      action: 'EXPENSE_CLAIM_SUBMITTED',
      category: 'TRANSACTION',
      details: `Submitted reimbursement claim ${newClaim.claimNumber} for $${data.amount.toFixed(2)} (${data.category})`,
      ipAddress: data.employee.ipAddress,
      riskLevel: 'LOW',
      status: 'SUCCESS'
    });

    return newClaim;
  }

  static updateClaimStatus(
    claimId: string, 
    newStatus: ExpenseClaim['status'], 
    reviewer: UserProfile, 
    notes?: string
  ): boolean {
    const claim = this.claims.find(c => c.id === claimId);
    if (!claim) return false;

    claim.status = newStatus;
    if (notes) claim.reviewNotes = notes;

    if (newStatus === 'DISBURSED') {
      const checking = this.accounts.find(a => a.type === 'CHECKING') || this.accounts[0];
      this.recordTransaction({
        accountId: checking.id,
        type: 'REIMBURSEMENT',
        category: 'Employee Travel & Expenses',
        amount: -claim.amount,
        counterparty: `${claim.employeeName} (Direct Deposit)`,
        description: `Automated Disbursement for Claim ${claim.claimNumber}: ${claim.title}`,
        taxDeductible: true,
        initiator: reviewer
      });
    }

    this.addAuditLog({
      userId: reviewer.id,
      userName: reviewer.name,
      userRole: reviewer.role,
      action: `CLAIM_${newStatus}`,
      category: 'TRANSACTION',
      details: `Expense claim ${claim.claimNumber} marked as ${newStatus} by ${reviewer.name}`,
      ipAddress: reviewer.ipAddress,
      riskLevel: 'LOW',
      status: 'SUCCESS'
    });

    return true;
  }

  // Users & RBAC
  static getUsers(): UserProfile[] {
    return this.users;
  }

  static getUserById(id: string): UserProfile | undefined {
    return this.users.find(u => u.id === id);
  }

  static getCurrentUser(): UserProfile {
    return this.users.find(u => u.id === this.currentUserId) || this.users[0];
  }

  static setCurrentUserId(id: string): void {
    this.currentUserId = id;
  }

  static updateUserLimits(userId: string, limits: { spendingLimitMonthly?: number; twoFactorEnabled?: boolean }): boolean {
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;
    if (limits.spendingLimitMonthly !== undefined) user.spendingLimitMonthly = limits.spendingLimitMonthly;
    if (limits.twoFactorEnabled !== undefined) user.twoFactorEnabled = limits.twoFactorEnabled;
    return true;
  }

  // Audit Logs
  static getAuditLogs(): AuditLogEntry[] {
    return this.auditLogs;
  }

  static addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const newLog: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    this.auditLogs = [newLog, ...this.auditLogs].slice(0, 100);
    return newLog;
  }

  // Cloud Backups
  static getCloudBackups(): CloudBackupSnapshot[] {
    return this.backups;
  }

  static createCloudSnapshot(user: UserProfile): CloudBackupSnapshot {
    const recordCount = this.accounts.length + this.transactions.length + this.claims.length;
    const sizeBytes = 4100000 + Math.floor(Math.random() * 500000);
    const checksum = generateCryptoHash(`snapshot-${Date.now()}-${recordCount}`);

    const newSnapshot: CloudBackupSnapshot = {
      id: `bk-${Date.now()}`,
      snapshotId: `SNAP-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      sizeBytes,
      recordCount,
      sha256Checksum: checksum,
      encryptionCipher: 'AES-256-GCM',
      storageLocation: 's3://apex-banking-vault-us-east-1/snapshots/' + checksum.substring(0, 12) + '.enc',
      status: 'VERIFIED',
      automated: false
    };

    this.backups = [newSnapshot, ...this.backups];

    this.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'CLOUD_BACKUP_CREATED',
      category: 'BACKUP',
      details: `Encrypted cloud snapshot ${newSnapshot.snapshotId} generated and replicated to us-east-1 vault (AES-256-GCM)`,
      ipAddress: user.ipAddress,
      riskLevel: 'LOW',
      status: 'SUCCESS'
    });

    return newSnapshot;
  }

  // Security Posture Metrics
  static calculateSecurityMetrics(): SecurityPostureMetrics {
    const users = this.users;
    const twoFactorRate = users.filter(u => u.twoFactorEnabled).length / users.length;
    const identityScore = Math.round(twoFactorRate * 95 + 5);
    const encryptionScore = 98;
    const rbacIsolationScore = 99;
    const dualControlScore = 95;
    const auditTrailScore = 98;
    const backupReliabilityScore = 97;

    const overallScore = Math.round(
      (identityScore * 0.2) +
      (encryptionScore * 0.2) +
      (rbacIsolationScore * 0.2) +
      (dualControlScore * 0.15) +
      (auditTrailScore * 0.1) +
      (backupReliabilityScore * 0.15)
    );

    const failedAttempts = this.auditLogs.filter(l => l.status === 'DENIED').length;

    return {
      overallScore,
      identityScore,
      encryptionScore,
      rbacIsolationScore,
      dualControlScore,
      auditTrailScore,
      backupReliabilityScore,
      activeSessionsCount: users.length,
      failedAttemptsPast24h: failedAttempts,
      ledgerIntegrityVerified: true,
      lastTamperAudit: '2026-09-15 08:31 EDT'
    };
  }

  // Financial Health Metrics
  static calculateFinancialHealth(): FinancialHealthMetrics {
    const totalLiquidity = this.accounts.reduce((sum, a) => sum + a.balance, 0);
    const incoming = this.transactions.filter(t => t.amount > 0 && t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0);
    const outgoing = this.transactions.filter(t => t.amount < 0 && t.status === 'COMPLETED').reduce((s, t) => s + Math.abs(t.amount), 0);

    const monthlyBurnRate = 75400;
    const cashRunwayMonths = Number((totalLiquidity / monthlyBurnRate).toFixed(1));
    const netOperatingCashFlow = incoming - outgoing;

    return {
      cashRunwayMonths,
      monthlyBurnRate,
      netOperatingCashFlow,
      totalLiquidity,
      quickRatio: 3.42,
      currentRatio: 4.15,
      debtToEquityRatio: 0.12,
      monthlyRevenue: 57812.50,
      monthlyExpenses: 75400.00,
      taxReserveFundedPct: 98.4
    };
  }
}
