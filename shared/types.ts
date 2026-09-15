export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
  spendingLimitMonthly: number;
  currentMonthSpent: number;
  lastLogin: string;
  ipAddress: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
}

export type TransactionType = 
  | 'PAYMENT_OUT' 
  | 'PAYMENT_IN' 
  | 'PAYROLL' 
  | 'WIRE_TRANSFER' 
  | 'VENDOR_INVOICE' 
  | 'TAX_ESCROW'
  | 'REIMBURSEMENT';

export type TransactionStatus = 
  | 'COMPLETED' 
  | 'PENDING_DUAL_AUTH' 
  | 'PROCESSING' 
  | 'REJECTED' 
  | 'CANCELLED';

export interface BankAccount {
  id: string;
  accountNumber: string;
  routingNumber: string;
  name: string;
  type: 'CHECKING' | 'TREASURY' | 'TAX_ESCROW' | 'PAYROLL' | 'EQUITY_RESERVE';
  currency: string;
  balance: number;
  availableBalance: number;
  institutionName: string;
  status: 'ACTIVE' | 'FROZEN';
}

export interface Transaction {
  id: string;
  referenceNumber: string;
  timestamp: string;
  accountId: string;
  accountName: string;
  type: TransactionType;
  category: string;
  amount: number; // positive for incoming, negative for outgoing
  currency: string;
  counterparty: string;
  description: string;
  status: TransactionStatus;
  initiatedByUserId: string;
  initiatedByName: string;
  approvedByUserId?: string;
  approvedByName?: string;
  dualAuthRequired: boolean;
  taxDeductible?: boolean;
  receiptAttachment?: string;
  cryptoHash?: string; // Tamper-evident ledger hash
}

export interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  title: string;
  category: 'TRAVEL' | 'SOFTWARE' | 'HARDWARE' | 'MEALS' | 'OFFICE' | 'TRAINING' | 'OTHER';
  amount: number;
  currency: string;
  dateIncurred: string;
  submissionDate: string;
  description: string;
  status: 'SUBMITTED' | 'ACCOUNTANT_REVIEW' | 'APPROVED' | 'DISBURSED' | 'REJECTED';
  receiptName?: string;
  reviewNotes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'AUTH' | 'TRANSACTION' | 'RBAC' | 'BACKUP' | 'SECURITY';
  details: string;
  ipAddress: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'SUCCESS' | 'DENIED' | 'FLAGGED';
}

export interface CloudBackupSnapshot {
  id: string;
  snapshotId: string;
  timestamp: string;
  sizeBytes: number;
  recordCount: number;
  sha256Checksum: string;
  encryptionCipher: 'AES-256-GCM';
  storageLocation: string;
  status: 'HEALTHY' | 'VERIFIED' | 'REPLICATING' | 'RESTORED';
  automated: boolean;
}

export interface SecurityPostureMetrics {
  overallScore: number; // 0-100
  identityScore: number;
  encryptionScore: number;
  rbacIsolationScore: number;
  dualControlScore: number;
  auditTrailScore: number;
  backupReliabilityScore: number;
  activeSessionsCount: number;
  failedAttemptsPast24h: number;
  ledgerIntegrityVerified: boolean;
  lastTamperAudit: string;
}

export interface FinancialHealthMetrics {
  cashRunwayMonths: number;
  monthlyBurnRate: number;
  netOperatingCashFlow: number;
  totalLiquidity: number;
  quickRatio: number;
  currentRatio: number;
  debtToEquityRatio: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  taxReserveFundedPct: number;
}
