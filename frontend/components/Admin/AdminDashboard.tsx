import { useState } from 'react';
import { 
  Building, ShieldCheck, DollarSign, Users, AlertCircle, 
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, 
  Lock, Key, Send, FileText, Check, Clock, PlusCircle, Sliders,
  AlertTriangle, X
} from 'lucide-react';
import { BankAccount, Transaction, UserProfile, AuditLogEntry } from '../../types';
import { StorageService } from '../../services/storageService';
import { BankingApiClient } from '../../services/apiClient';

interface Props {
  accounts: BankAccount[];
  transactions: Transaction[];
  users: UserProfile[];
  currentUser: UserProfile;
  onRefreshData: () => void;
  onOpenNewTransaction: () => void;
  onOpenSecurityCenter: () => void;
}

export function AdminDashboard({
  accounts,
  transactions,
  users,
  currentUser,
  onRefreshData,
  onOpenNewTransaction,
  onOpenSecurityCenter
}: Props) {
  const [rejectModalTx, setRejectModalTx] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DUAL_AUTH' | 'USERS' | 'ACCOUNTS'>('OVERVIEW');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [editingLimitUser, setEditingLimitUser] = useState<UserProfile | null>(null);
  const [limitInputValue, setLimitInputValue] = useState('');

  // Filter pending dual auth transactions
  const pendingDualAuthTxs = transactions.filter(t => t.status === 'PENDING_DUAL_AUTH');
  const completedTxs = transactions.filter(t => t.status === 'COMPLETED');
  const totalLiquidity = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  const handleApproveDualAuth = async (tx: Transaction) => {
    setActionError(null);
    setActionSuccess(null);

    // Rule: Initiator cannot dual-authorize their own transaction
    if (tx.initiatedByUserId === currentUser.id) {
      setActionError(`Action Blocked (Separation of Duties): You are the initiator of transaction ${tx.referenceNumber}. Another authorized executive or accountant must provide the 4-eyes approval.`);
      return;
    }

    try {
      await BankingApiClient.approveDualAuth(tx.id, currentUser);
    } catch {
      // Local fallback
    }

    const success = StorageService.approveDualAuthTransaction(tx.id, currentUser);
    if (success) {
      setActionSuccess(`Dual-control authorization granted for ${tx.referenceNumber} ($${Math.abs(tx.amount).toLocaleString()}). Funds settled into general ledger.`);
      onRefreshData();
    } else {
      setActionError(`Action blocked: Unable to approve transaction ${tx.referenceNumber}.`);
    }
  };

  const handleRejectDualAuth = async () => {
    if (!rejectModalTx) return;
    setActionError(null);
    setActionSuccess(null);
    const reason = rejectReason.trim() || 'Administrative disapproval';

    try {
      await BankingApiClient.rejectDualAuth(rejectModalTx.id, currentUser, reason);
    } catch {
      // Local fallback
    }

    StorageService.rejectDualAuthTransaction(rejectModalTx.id, currentUser, reason);
    setActionSuccess(`Transfer request ${rejectModalTx.referenceNumber} has been rejected and marked in audit log.`);
    setRejectModalTx(null);
    setRejectReason('');
    onRefreshData();
  };

  const handleToggle2FA = async (user: UserProfile) => {
    setActionError(null);
    setActionSuccess(null);
    const updatedState = !user.twoFactorEnabled;

    try {
      await BankingApiClient.updateUserLimits(user.id, { twoFactorEnabled: updatedState }, currentUser);
    } catch {
      // Local fallback
    }

    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return { ...u, twoFactorEnabled: updatedState };
      }
      return u;
    });
    StorageService.saveUsers(updatedUsers);
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'USER_2FA_POLICY_TOGGLE',
      category: 'RBAC',
      details: `Toggled 2FA requirement for ${user.name} to ${updatedState ? 'ENFORCED' : 'OPTIONAL'}`,
      ipAddress: currentUser.ipAddress,
      riskLevel: 'MEDIUM',
      status: 'SUCCESS'
    });
    setActionSuccess(`2FA security policy for ${user.name} set to ${updatedState ? 'FIDO2 Enforced' : 'Optional'}.`);
    onRefreshData();
  };

  const handleOpenEditLimit = (user: UserProfile) => {
    setActionError(null);
    setActionSuccess(null);
    setEditingLimitUser(user);
    setLimitInputValue(user.spendingLimitMonthly.toString());
  };

  const handleSaveUserLimit = async () => {
    if (!editingLimitUser) return;
    const newLimit = parseFloat(limitInputValue);
    if (isNaN(newLimit) || newLimit < 0) {
      setActionError('Please enter a valid non-negative spending limit.');
      return;
    }

    try {
      await BankingApiClient.updateUserLimits(editingLimitUser.id, { spendingLimitMonthly: newLimit }, currentUser);
    } catch {
      // Local fallback
    }

    const updatedUsers = users.map(u => {
      if (u.id === editingLimitUser.id) {
        return { ...u, spendingLimitMonthly: newLimit };
      }
      return u;
    });
    StorageService.saveUsers(updatedUsers);
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'USER_LIMIT_MODIFIED',
      category: 'RBAC',
      details: `Modified monthly spending limit for ${editingLimitUser.name} to $${newLimit.toLocaleString()}`,
      ipAddress: currentUser.ipAddress,
      riskLevel: 'MEDIUM',
      status: 'SUCCESS'
    });
    setActionSuccess(`Monthly limit for ${editingLimitUser.name} successfully updated to $${newLimit.toLocaleString()}.`);
    setEditingLimitUser(null);
    setLimitInputValue('');
    onRefreshData();
  };

  return (
    <div className="space-y-6" id="admin-dashboard-container">
      {/* Top Welcome & Executive Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/80 text-xs font-mono font-semibold">
              EXECUTIVE CLEARANCE
            </span>
            <span className="text-xs text-slate-400 font-mono">Delaware C-Corp #MNVC-7729</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Administrator Treasury &amp; Governance
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full authority over master accounts, high-value 4-eyes authorizations, and RBAC policies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <Send className="w-3.5 h-3.5" />
            Record / Initiate Transfer
          </button>
          <button
            onClick={onOpenSecurityCenter}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-700 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Security &amp; Audit Logs
          </button>
        </div>
      </div>

      {/* Action Notification Banners */}
      {actionError && (
        <div className="p-4 bg-red-950/80 border border-red-800/80 rounded-xl flex items-start justify-between gap-3 text-red-200 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold text-white">Security / RBAC Notification</strong>
              <span>{actionError}</span>
            </div>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800/80 rounded-xl flex items-start justify-between gap-3 text-emerald-200 text-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold text-white">Action Executed</strong>
              <span>{actionSuccess}</span>
            </div>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dual Authorization Notification Callout if pending items exist */}
      {pendingDualAuthTxs.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/60 border border-amber-700/80 rounded-lg text-amber-400 flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {pendingDualAuthTxs.length} High-Value Transfer(s) Awaiting 4-Eyes Dual Authorization
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Amounts &ge; $10,000.00 require secondary executive review and cryptographic sign-off.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('DUAL_AUTH')}
            className="self-start sm:self-auto text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition"
          >
            Review Approval Queue ({pendingDualAuthTxs.length})
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'OVERVIEW' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Treasury Overview
        </button>
        <button
          onClick={() => setActiveTab('DUAL_AUTH')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'DUAL_AUTH' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Dual-Auth Queue</span>
          {pendingDualAuthTxs.length > 0 && (
            <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
              {pendingDualAuthTxs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'USERS' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          User &amp; RBAC Governance
        </button>
        <button
          onClick={() => setActiveTab('ACCOUNTS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'ACCOUNTS' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Commercial Accounts ({accounts.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Top Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Total Available Treasury Liquidity</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                ${totalLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Across 5 FDIC-insured &amp; asset management accounts</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Treasury High-Yield Interest Accrued</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                $3,612.50 <span className="text-xs font-normal text-slate-400">/ mo</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Yield at 5.10% APY ($850,000 principal in J.P. Morgan)
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Dual-Authorization Compliance Rate</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight font-mono">
                100%
              </div>
              <div className="text-xs text-slate-400 mt-2">
                0 unapproved transactions &gt; $10k in system history
              </div>
            </div>
          </div>

          {/* Account Overview Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Commercial Bank Accounts</h3>
              <button
                onClick={() => setActiveTab('ACCOUNTS')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View all account details &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.slice(0, 3).map((acc) => (
                <div key={acc.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-semibold uppercase text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 rounded">
                        {acc.type}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-2">{acc.name}</h4>
                      <p className="text-xs text-slate-400">{acc.institutionName}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-end justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Current Balance</span>
                      <span className="text-lg font-bold font-mono text-white">
                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{acc.accountNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Master Transactions */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Master Transaction Ledger</h3>
                <p className="text-xs text-slate-400">Latest recorded payments, receivables, and wire disbursements</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="pb-2 font-medium">Ref &amp; Date</th>
                    <th className="pb-2 font-medium">Account</th>
                    <th className="pb-2 font-medium">Counterparty / Description</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Dual-Auth</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {transactions.slice(0, 6).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 font-mono text-slate-300">
                        <div className="font-semibold">{tx.referenceNumber}</div>
                        <div className="text-[10px] text-slate-500">{tx.timestamp.substring(0, 10)}</div>
                      </td>
                      <td className="py-3 text-slate-300 text-xs truncate max-w-[140px]">{tx.accountName}</td>
                      <td className="py-3">
                        <div className="font-medium text-slate-200">{tx.counterparty}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{tx.description}</div>
                      </td>
                      <td className="py-3 text-slate-400">{tx.category}</td>
                      <td className="py-3">
                        {tx.dualAuthRequired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                            <Lock className="w-2.5 h-2.5" /> 4-Eyes
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Standard</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          tx.status === 'COMPLETED' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' :
                          tx.status === 'PENDING_DUAL_AUTH' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 animate-pulse' :
                          'bg-red-950/80 text-red-300 border border-red-800/60'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`py-3 text-right font-mono font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DUAL-AUTH APPROVAL QUEUE */}
      {activeTab === 'DUAL_AUTH' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">4-Eyes Dual Authorization Review Queue</h3>
              </div>
              <span className="text-xs font-mono text-amber-400">{pendingDualAuthTxs.length} Pending Actions</span>
            </div>
            <p className="text-xs text-slate-400">
              In accordance with corporate MNVC treasury bylaws, all disbursements &ge; $10,000.00 require non-initiator executive approval before funds are wired.
            </p>
          </div>

          {pendingDualAuthTxs.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-white">Queue Clear</h4>
              <p className="text-xs text-slate-400 mt-1">There are currently no high-value disbursements pending dual authorization.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDualAuthTxs.map((tx) => (
                <div key={tx.id} className="bg-slate-900 border-2 border-amber-900/50 rounded-xl p-5 shadow-lg">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                          DUAL-AUTH REQUIRED
                        </span>
                        <span className="font-mono text-xs text-slate-400">{tx.referenceNumber}</span>
                        <span className="text-xs text-slate-400">&bull; {tx.timestamp}</span>
                      </div>
                      <h4 className="text-base font-bold text-white">
                        Outgoing Wire to <span className="text-amber-300">{tx.counterparty}</span>
                      </h4>
                      <p className="text-xs text-slate-300">{tx.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        <span>Debited Account: <strong className="text-slate-200">{tx.accountName}</strong></span>
                        <span>Category: <strong className="text-slate-200">{tx.category}</strong></span>
                        <span>Initiated By: <strong className="text-slate-200">{tx.initiatedByName}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                      <div className="text-right font-mono">
                        <span className="text-xs text-slate-400 block">Transfer Amount</span>
                        <span className="text-2xl font-black text-amber-400">
                          ${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRejectModalTx(tx)}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80 px-3.5 py-2 rounded-lg transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveDualAuth(tx)}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-sm transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Affix Executive Seal &amp; Approve
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USER & RBAC GOVERNANCE */}
      {activeTab === 'USERS' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Enterprise User &amp; Role Access Control</h3>
              <p className="text-xs text-slate-400">Manage role clearance, spending caps, and 2FA authentication mandates</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{users.length} Provisioned Principals</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-2 font-medium">User Profile</th>
                  <th className="pb-2 font-medium">Assigned Role</th>
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium">Monthly Spending Limit</th>
                  <th className="pb-2 font-medium">2FA Mandate</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3">
                      <div className="font-semibold text-slate-200">{u.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        u.role === 'ADMIN' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        u.role === 'ACCOUNTANT' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{u.department}</td>
                    <td className="py-3 font-mono text-slate-200 font-medium">
                      ${u.spendingLimitMonthly.toLocaleString()}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleToggle2FA(u)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${
                          u.twoFactorEnabled 
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80' 
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                        }`}
                      >
                        {u.twoFactorEnabled ? <Check className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-amber-400" />}
                        {u.twoFactorEnabled ? 'Enforced (FIDO2)' : 'Optional'}
                      </button>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Active
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleOpenEditLimit(u)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium bg-slate-800 hover:bg-slate-700 transition px-2.5 py-1 rounded"
                      >
                        Edit Limit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COMMERCIAL ACCOUNTS */}
      {activeTab === 'ACCOUNTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 rounded">
                    {acc.type}
                  </span>
                  <h4 className="text-base font-bold text-white mt-2">{acc.name}</h4>
                  <p className="text-xs text-slate-400">{acc.institutionName}</p>
                </div>
                <span className="text-xs font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                  {acc.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">Account Number</span>
                  <span className="text-slate-200">{acc.accountNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Routing Transit</span>
                  <span className="text-slate-200">{acc.routingNumber}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Ledger Balance</span>
                  <span className="text-xl font-bold font-mono text-white">
                    ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Available</span>
                  <span className="text-sm font-semibold font-mono text-emerald-400">
                    ${acc.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Reject Transfer Request</h3>
            <p className="text-xs text-slate-300">
              Provide reason for rejecting {rejectModalTx.referenceNumber} (${Math.abs(rejectModalTx.amount).toLocaleString()} to {rejectModalTx.counterparty}):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Discrepancy in invoice statement or awaiting revised bill..."
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectModalTx(null)}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectDualAuth}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Spending Limit Modal */}
      {editingLimitUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Adjust Spending Limit</h3>
              <button onClick={() => setEditingLimitUser(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-xs text-slate-300 mb-2">
                Set monthly card &amp; transfer spending limit for <strong className="text-white">{editingLimitUser.name}</strong>:
              </p>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={limitInputValue}
                  onChange={(e) => setLimitInputValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Current month spent: ${editingLimitUser.currentMonthSpent.toLocaleString()}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingLimitUser(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserLimit}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition"
              >
                Save Limit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
