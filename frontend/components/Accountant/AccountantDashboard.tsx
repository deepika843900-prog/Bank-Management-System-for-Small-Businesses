import { useState } from 'react';
import { 
  FileSpreadsheet, PlusCircle, CheckCircle2, Clock, 
  ArrowUpRight, ArrowDownRight, Filter, Download, Search, 
  Check, FileCheck, DollarSign, Calculator, Receipt, Printer, Send
} from 'lucide-react';
import { BankAccount, Transaction, UserProfile, ExpenseClaim, FinancialHealthMetrics } from '../../types';
import { StorageService } from '../../services/storageService';
import { BankingApiClient } from '../../services/apiClient';

interface Props {
  accounts: BankAccount[];
  transactions: Transaction[];
  claims: ExpenseClaim[];
  metrics: FinancialHealthMetrics;
  currentUser: UserProfile;
  onRefreshData: () => void;
  onOpenNewTransaction: () => void;
}

export function AccountantDashboard({
  accounts,
  transactions,
  claims,
  metrics,
  currentUser,
  onRefreshData,
  onOpenNewTransaction
}: Props) {
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'CLAIMS_AUDIT' | 'TAX_ESCROW' | 'STATEMENTS'>('LEDGER');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Filtered transactions
  const filteredTxs = transactions.filter(tx => {
    const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
    const matchesSearch = 
      tx.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.counterparty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const pendingClaims = claims.filter(c => c.status === 'SUBMITTED' || c.status === 'ACCOUNTANT_REVIEW');

  const handleReviewClaim = async (claimId: string, approve: boolean) => {
    const newStatus = approve ? 'APPROVED' : 'REJECTED';
    const notes = approve ? 'Audited by CPA for policy compliance.' : 'Rejected: Requires valid tax receipt.';

    try {
      await BankingApiClient.updateClaimStatus(claimId, newStatus, currentUser, notes);
    } catch {
      // Local fallback
    }

    StorageService.updateClaimStatus(claimId, newStatus, currentUser, notes);
    onRefreshData();
  };

  const handleDisburseClaim = async (claimId: string) => {
    const notes = 'Direct reimbursement transfer released to employee bank via ACH.';

    try {
      await BankingApiClient.updateClaimStatus(claimId, 'DISBURSED', currentUser, notes);
    } catch {
      // Local fallback
    }

    StorageService.updateClaimStatus(claimId, 'DISBURSED', currentUser, notes);
    onRefreshData();
  };

  const handleExportCSV = () => {
    const headers = ['Reference', 'Timestamp', 'Account', 'Type', 'Category', 'Counterparty', 'Description', 'Amount', 'Currency', 'Status'];
    const rows = transactions.map(t => [
      t.referenceNumber,
      t.timestamp,
      `"${t.accountName}"`,
      t.type,
      `"${t.category}"`,
      `"${t.counterparty}"`,
      `"${t.description}"`,
      t.amount,
      t.currency,
      t.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Apex_General_Ledger_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="accountant-dashboard-container">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/80 text-xs font-mono font-semibold">
              ACCOUNTING &amp; TREASURY CLEARANCE
            </span>
            <span className="text-xs text-slate-400 font-mono">GAAP / IFRS General Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Accountant General Ledger &amp; Reconciliation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bookkeeping, accounts payable/receivable, corporate tax provisions, and audit compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Record Payment / Journal Entry
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Ledger CSV
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'LEDGER' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          General Ledger ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('CLAIMS_AUDIT')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'CLAIMS_AUDIT' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Expense Claims Audit</span>
          {pendingClaims.length > 0 && (
            <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
              {pendingClaims.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('TAX_ESCROW')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'TAX_ESCROW' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tax Escrow &amp; Deductions
        </button>
        <button
          onClick={() => setActiveTab('STATEMENTS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'STATEMENTS' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Financial Statements (P&amp;L)
        </button>
      </div>

      {/* TAB 1: GENERAL LEDGER */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search reference, counterparty, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Types</option>
                <option value="PAYMENT_IN">Payment In (Receivables)</option>
                <option value="PAYMENT_OUT">Payment Out (Disbursement)</option>
                <option value="WIRE_TRANSFER">Wire Transfer</option>
                <option value="PAYROLL">Payroll Batch</option>
                <option value="TAX_ESCROW">Tax Escrow</option>
                <option value="REIMBURSEMENT">Reimbursement</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="pb-2 font-medium">Tx Ref &amp; Date</th>
                    <th className="pb-2 font-medium">Source Account</th>
                    <th className="pb-2 font-medium">Counterparty</th>
                    <th className="pb-2 font-medium">Classification</th>
                    <th className="pb-2 font-medium">Tax Tag</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Debit / Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 font-mono text-slate-300">
                        <div className="font-semibold text-white">{tx.referenceNumber}</div>
                        <div className="text-[10px] text-slate-500">{tx.timestamp}</div>
                      </td>
                      <td className="py-3 text-slate-300 text-xs truncate max-w-[130px]">{tx.accountName}</td>
                      <td className="py-3">
                        <div className="font-medium text-slate-200">{tx.counterparty}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{tx.description}</div>
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3">
                        {tx.taxDeductible ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                            Deductible
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Standard</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          tx.status === 'COMPLETED' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' :
                          tx.status === 'PENDING_DUAL_AUTH' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' :
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

      {/* TAB 2: EXPENSE CLAIMS AUDIT */}
      {activeTab === 'CLAIMS_AUDIT' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-white">Employee Expense Reimbursements Audit</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">{claims.length} Claims Filed</span>
            </div>
            <p className="text-xs text-slate-400">
              Accountant stage verification: audit receipts, verify travel/software policy compliance, and pass to disbursement queue.
            </p>
          </div>

          <div className="space-y-3">
            {claims.map((claim) => (
              <div key={claim.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-bold">{claim.claimNumber}</span>
                    <span className="text-xs text-slate-400">&bull; Submitted {claim.submissionDate}</span>
                    <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">{claim.category}</span>
                  </div>
                  <h4 className="text-base font-bold text-white">{claim.title}</h4>
                  <p className="text-xs text-slate-300">{claim.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                    <span>Employee: <strong className="text-slate-200">{claim.employeeName}</strong> ({claim.department})</span>
                    {claim.receiptName && (
                      <span className="flex items-center gap-1 text-indigo-400 underline">
                        <FileCheck className="w-3.5 h-3.5" /> {claim.receiptName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                  <div className="text-right font-mono">
                    <span className="text-xs text-slate-400 block">Claim Amount</span>
                    <span className="text-xl font-bold text-white">${claim.amount.toFixed(2)}</span>
                  </div>

                  {claim.status === 'SUBMITTED' || claim.status === 'ACCOUNTANT_REVIEW' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewClaim(claim.id, false)}
                        className="text-xs bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80 px-3 py-1.5 rounded-lg transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleReviewClaim(claim.id, true)}
                        className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve Audit
                      </button>
                    </div>
                  ) : claim.status === 'APPROVED' ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                        APPROVED
                      </span>
                      <button
                        onClick={() => handleDisburseClaim(claim.id)}
                        className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" /> Disburse ACH
                      </button>
                    </div>
                  ) : (
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      claim.status === 'DISBURSED' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800' :
                      'bg-red-950/80 text-red-300 border border-red-800'
                    }`}>
                      {claim.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TAX ESCROW */}
      {activeTab === 'TAX_ESCROW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Corporate Tax Escrow Balance</span>
              <div className="text-2xl font-bold font-mono text-white">$62,450.00</div>
              <div className="text-xs text-emerald-400 mt-2 font-medium">Funded at 98.4% of Q3 Liability</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Estimated Federal Corporate Tax</span>
              <div className="text-2xl font-bold font-mono text-amber-400">$12,500.00</div>
              <div className="text-xs text-slate-400 mt-2">Due Oct 15, 2026 (Quarterly EFTPS)</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <span className="text-xs text-slate-400 block mb-1">YTD Tax-Deductible Operational Spend</span>
              <div className="text-2xl font-bold font-mono text-indigo-400">$98,420.00</div>
              <div className="text-xs text-slate-400 mt-2">R&amp;D Tax Credits Qualified</div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Automated Tax Provisions Schedule</h3>
            <p className="text-xs text-slate-400 mb-4">
              Apex Banking automatically sweeps 15% of all qualified incoming client retainers into the dedicated Tax Escrow reserve.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-300">IRS Form 1120 Q3 Estimated Corporate Income Tax</span>
                <span className="text-emerald-400 font-mono font-medium">REMITTED ($12,500.00)</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Delaware Annual Franchise Tax Reserve</span>
                <span className="text-slate-200 font-mono font-medium">ALLOCATED ($2,500.00)</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Section 41 R&amp;D Payroll Tax Credit Offset</span>
                <span className="text-cyan-400 font-mono font-medium">ACTIVE OFFSET ($15,000.00)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL STATEMENTS (P&L, BALANCE SHEET) */}
      {activeTab === 'STATEMENTS' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Consolidated Profit &amp; Loss Statement (P&amp;L)</h3>
              <p className="text-xs text-slate-400">Reporting Period: Month Ended September 2026 (USD)</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" /> Print Statement
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Revenue */}
            <div>
              <div className="flex justify-between font-bold text-sm text-slate-200 border-b border-slate-800 py-1.5">
                <span>OPERATING REVENUES</span>
                <span className="font-mono text-emerald-400">$57,812.50</span>
              </div>
              <div className="pl-4 space-y-1 py-2 text-slate-400">
                <div className="flex justify-between">
                  <span>Client SaaS Subscriptions &amp; Enterprise Retainers</span>
                  <span className="font-mono text-slate-300">$54,200.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Treasury Reserve Yield &amp; Money Market Interest</span>
                  <span className="font-mono text-slate-300">$3,612.50</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div>
              <div className="flex justify-between font-bold text-sm text-slate-200 border-b border-slate-800 py-1.5">
                <span>OPERATING EXPENSES</span>
                <span className="font-mono text-red-400">$75,400.00</span>
              </div>
              <div className="pl-4 space-y-1 py-2 text-slate-400">
                <div className="flex justify-between">
                  <span>Payroll, Engineering Compensation &amp; Benefits</span>
                  <span className="font-mono text-slate-300">$48,200.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Legal, Audit &amp; Corporate Governance Counsel</span>
                  <span className="font-mono text-slate-300">$18,500.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Cloud Computing, GPU Infrastructure &amp; Hosting</span>
                  <span className="font-mono text-slate-300">$14,850.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Employee Travel, Continuous Learning &amp; Stipends</span>
                  <span className="font-mono text-slate-300">$3,400.00</span>
                </div>
              </div>
            </div>

            {/* Net Income */}
            <div className="border-t-2 border-slate-700 pt-3 flex justify-between text-base font-bold text-white">
              <span>NET OPERATING INCOME / (CASH BURN)</span>
              <span className="font-mono text-amber-400">($17,587.50)</span>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              *Net burn comfortably funded by Series-A capital pool ($1.81M total treasury gives &gt;24 months of runway).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
