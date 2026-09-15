/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Common/Navbar';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AccountantDashboard } from './components/Accountant/AccountantDashboard';
import { EmployeeDashboard } from './components/Employee/EmployeeDashboard';
import { FinancialHealthAnalytics } from './components/Analytics/FinancialHealthAnalytics';
import { MeasurableSecurityDashboard } from './components/Security/MeasurableSecurityDashboard';
import { CloudBackupManager } from './components/Backup/CloudBackupManager';
import { AccessDeniedBarrier } from './components/Common/AccessDeniedBarrier';
import { SecurityLockModal } from './components/Common/SecurityLockModal';
import { NewTransactionModal } from './components/Modals/NewTransactionModal';
import { SubmitClaimModal } from './components/Modals/SubmitClaimModal';

import { StorageService } from './services/storageService';
import { BankingApiClient } from './services/apiClient';
import { 
  BankAccount, 
  Transaction, 
  UserProfile, 
  ExpenseClaim, 
  AuditLogEntry, 
  CloudBackupSnapshot,
  SecurityPostureMetrics,
  FinancialHealthMetrics,
  UserRole
} from './types';

export default function App() {
  // App Core State
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => StorageService.getCurrentUser());
  const [users, setUsers] = useState<UserProfile[]>(() => StorageService.getUsers());
  const [accounts, setAccounts] = useState<BankAccount[]>(() => StorageService.getAccounts());
  const [transactions, setTransactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [claims, setClaims] = useState<ExpenseClaim[]>(() => StorageService.getExpenseClaims());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => StorageService.getAuditLogs());
  const [backups, setBackups] = useState<CloudBackupSnapshot[]>(() => StorageService.getCloudBackups());

  // Metrics
  const [securityMetrics, setSecurityMetrics] = useState<SecurityPostureMetrics>(() => StorageService.calculateSecurityMetrics());
  const [financialMetrics, setFinancialMetrics] = useState<FinancialHealthMetrics>(() => StorageService.calculateFinancialHealth());

  // Active View navigation
  const [currentView, setCurrentView] = useState<string>('admin');

  // Modals & Security Terminal Lock
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [isSubmitClaimModalOpen, setIsSubmitClaimModalOpen] = useState(false);

  // Synchronize state from storage
  const refreshData = useCallback(() => {
    setAccounts(StorageService.getAccounts());
    setTransactions(StorageService.getTransactions());
    setUsers(StorageService.getUsers());
    setClaims(StorageService.getExpenseClaims());
    setAuditLogs(StorageService.getAuditLogs());
    setBackups(StorageService.getCloudBackups());
    setSecurityMetrics(StorageService.calculateSecurityMetrics());
    setFinancialMetrics(StorageService.calculateFinancialHealth());
  }, []);

  // Handle switching active authenticated user & RBAC role
  const handleSwitchUser = (userId: string) => {
    StorageService.setCurrentUser(userId);
    const updatedUser = StorageService.getUsers().find(u => u.id === userId) || StorageService.getCurrentUser();
    setCurrentUser(updatedUser);

    // Auto-navigate to user's permitted home dashboard
    if (updatedUser.role === 'ADMIN') {
      setCurrentView('admin');
    } else if (updatedUser.role === 'ACCOUNTANT') {
      setCurrentView('accountant');
    } else {
      setCurrentView('employee');
    }

    // Record server-validated audit log and local mirror
    BankingApiClient.recordAuditLog({
      action: 'USER_ROLE_AUTHENTICATED',
      category: 'AUTH',
      details: `Active session credentials switched to ${updatedUser.name} (${updatedUser.role} clearance)`,
      riskLevel: 'LOW'
    }, updatedUser.id);

    StorageService.addAuditLog({
      userId: updatedUser.id,
      userName: updatedUser.name,
      userRole: updatedUser.role,
      action: 'USER_ROLE_AUTHENTICATED',
      category: 'AUTH',
      details: `Active session credentials switched to ${updatedUser.name} (${updatedUser.role} clearance)`,
      ipAddress: updatedUser.ipAddress,
      riskLevel: 'LOW',
      status: 'SUCCESS'
    });

    refreshData();
  };

  // Helper to log and route to own dashboard
  const handleReturnToMyDashboard = () => {
    if (currentUser.role === 'ADMIN') setCurrentView('admin');
    else if (currentUser.role === 'ACCOUNTANT') setCurrentView('accountant');
    else setCurrentView('employee');
  };

  // Determine RBAC Clearance for Current View
  const renderContent = () => {
    // 1. Admin Dashboard View
    if (currentView === 'admin') {
      if (currentUser.role !== 'ADMIN') {
        return (
          <AccessDeniedBarrier
            currentUser={currentUser}
            attemptedSection="Executive Treasury &amp; Admin Dashboard"
            requiredRole="ADMIN"
            onReturnToMyDashboard={handleReturnToMyDashboard}
            onOpenSwitchUser={() => handleSwitchUser('usr-admin-1')}
          />
        );
      }
      return (
        <AdminDashboard
          accounts={accounts}
          transactions={transactions}
          users={users}
          currentUser={currentUser}
          onRefreshData={refreshData}
          onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
          onOpenSecurityCenter={() => setCurrentView('security')}
        />
      );
    }

    // 2. Accountant Dashboard View
    if (currentView === 'accountant') {
      if (currentUser.role !== 'ACCOUNTANT' && currentUser.role !== 'ADMIN') {
        return (
          <AccessDeniedBarrier
            currentUser={currentUser}
            attemptedSection="Accountant General Ledger &amp; Tax Escrow"
            requiredRole="ACCOUNTANT"
            onReturnToMyDashboard={handleReturnToMyDashboard}
            onOpenSwitchUser={() => handleSwitchUser('usr-acct-1')}
          />
        );
      }
      return (
        <AccountantDashboard
          accounts={accounts}
          transactions={transactions}
          claims={claims}
          metrics={financialMetrics}
          currentUser={currentUser}
          onRefreshData={refreshData}
          onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
        />
      );
    }

    // 3. Employee Dashboard View
    if (currentView === 'employee') {
      if (currentUser.role !== 'EMPLOYEE') {
        return (
          <AccessDeniedBarrier
            currentUser={currentUser}
            attemptedSection="Individual Employee Personal Portal"
            requiredRole="EMPLOYEE"
            onReturnToMyDashboard={handleReturnToMyDashboard}
            onOpenSwitchUser={() => handleSwitchUser('usr-emp-1')}
          />
        );
      }
      return (
        <EmployeeDashboard
          currentUser={currentUser}
          claims={claims}
          onRefreshData={refreshData}
          onOpenSubmitClaim={() => setIsSubmitClaimModalOpen(true)}
        />
      );
    }

    // 4. Financial Health Analytics View (Accessible to Admin & Accountant)
    if (currentView === 'analytics') {
      if (currentUser.role === 'EMPLOYEE') {
        return (
          <AccessDeniedBarrier
            currentUser={currentUser}
            attemptedSection="Company Financial Health &amp; Burn Runway Analytics"
            requiredRole={['ADMIN', 'ACCOUNTANT']}
            onReturnToMyDashboard={handleReturnToMyDashboard}
            onOpenSwitchUser={() => handleSwitchUser('usr-admin-1')}
          />
        );
      }
      return (
        <FinancialHealthAnalytics
          metrics={financialMetrics}
          transactions={transactions}
        />
      );
    }

    // 5. Measurable Security View (Accessible to Admin & Accountant)
    if (currentView === 'security') {
      return (
        <MeasurableSecurityDashboard
          metrics={securityMetrics}
          auditLogs={auditLogs}
          users={users}
          currentUser={currentUser}
          onRefreshData={refreshData}
          onOpenBackups={() => setCurrentView('backups')}
        />
      );
    }

    // 6. Cloud Backups Vault View (Accessible to Admin)
    if (currentView === 'backups') {
      if (currentUser.role !== 'ADMIN') {
        return (
          <AccessDeniedBarrier
            currentUser={currentUser}
            attemptedSection="Encrypted Cloud Backups Vault"
            requiredRole="ADMIN"
            onReturnToMyDashboard={handleReturnToMyDashboard}
            onOpenSwitchUser={() => handleSwitchUser('usr-admin-1')}
          />
        );
      }
      return (
        <CloudBackupManager
          backups={backups}
          currentUser={currentUser}
          onRefreshData={refreshData}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Banking Navigation Bar */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={handleSwitchUser}
        onLockSession={() => setIsSessionLocked(true)}
        securityScore={securityMetrics.overallScore}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>

      {/* Footer with Security & Bank System Status */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 font-medium">Core Banking Node Online</span>
            <span>&bull;</span>
            <span className="font-mono text-[11px]">TLS 1.3 &bull; AES-256-GCM Backups &bull; 4-Eyes Dual Auth Enforced</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Apex Ventures &amp; Dynamics (MNVC)</span>
            <span>&bull;</span>
            <span className="text-slate-400">Current Role Clearance: <strong className="text-indigo-400 font-mono">{currentUser.role}</strong></span>
          </div>
        </div>
      </footer>

      {/* Security PIN Lock Screen Modal */}
      <SecurityLockModal
        currentUser={currentUser}
        isOpen={isSessionLocked}
        onUnlock={() => setIsSessionLocked(false)}
      />

      {/* New Transaction / Wire Transfer Modal */}
      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
        accounts={accounts}
        currentUser={currentUser}
        onSuccess={refreshData}
      />

      {/* Submit Expense Claim Modal */}
      <SubmitClaimModal
        isOpen={isSubmitClaimModalOpen}
        onClose={() => setIsSubmitClaimModalOpen(false)}
        currentUser={currentUser}
        onSuccess={refreshData}
      />
    </div>
  );
}
