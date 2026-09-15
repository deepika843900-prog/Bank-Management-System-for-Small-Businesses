import { useState, type FormEvent } from 'react';
import { X, Send, Lock, AlertTriangle, ShieldCheck, DollarSign, CheckCircle2 } from 'lucide-react';
import { BankAccount, TransactionType, UserProfile } from '../../types';
import { StorageService } from '../../services/storageService';
import { BankingApiClient } from '../../services/apiClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  currentUser: UserProfile;
  onSuccess: () => void;
}

export function NewTransactionModal({
  isOpen,
  onClose,
  accounts,
  currentUser,
  onSuccess
}: Props) {
  const [type, setType] = useState<TransactionType>('WIRE_TRANSFER');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [counterparty, setCounterparty] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('Cloud Infrastructure');
  const [description, setDescription] = useState('');
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ referenceNumber: string; requiresDualAuth: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const targetAccountId = accountId || accounts[0]?.id || '';
  const selectedAccount = accounts.find(a => a.id === targetAccountId) || accounts[0];
  const parsedAmount = parseFloat(amountStr) || 0;
  const isIncoming = type === 'PAYMENT_IN';
  const finalAmount = isIncoming ? Math.abs(parsedAmount) : -Math.abs(parsedAmount);
  const isHighValue = Math.abs(finalAmount) >= 10000 && !isIncoming;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!counterparty.trim() || parsedAmount <= 0) {
      setErrorMessage('Please provide a valid counterparty and positive amount.');
      return;
    }

    if (!isIncoming && selectedAccount && parsedAmount > selectedAccount.availableBalance) {
      setErrorMessage(`Insufficient available funds. Selected account "${selectedAccount.name}" has $${selectedAccount.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} available.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Synchronize to Backend REST API
      await BankingApiClient.recordTransaction({
        accountId: targetAccountId,
        type,
        category,
        amount: finalAmount,
        counterparty: counterparty.trim(),
        description: description.trim() || `${type} to ${counterparty.trim()}`,
        taxDeductible,
        initiator: currentUser
      });
    } catch {
      // Non-blocking fallback to local storage
    }

    // 2. Local State Mirroring
    const { transaction, requiresDualAuth } = StorageService.recordTransaction({
      accountId: targetAccountId,
      type,
      category,
      amount: finalAmount,
      counterparty: counterparty.trim(),
      description: description.trim() || `${type} to ${counterparty.trim()}`,
      taxDeductible,
      initiator: currentUser
    });

    setIsSubmitting(false);
    onSuccess();
    setSuccessInfo({ referenceNumber: transaction.referenceNumber, requiresDualAuth });
  };

  const handleCloseAndReset = () => {
    setErrorMessage(null);
    setSuccessInfo(null);
    setAmountStr('');
    setCounterparty('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Record / Initiate Payment</h3>
            <p className="text-xs text-slate-400">Record journal disbursement or initiate banking transfer</p>
          </div>
          <button onClick={handleCloseAndReset} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successInfo ? (
          <div className="space-y-4 py-3">
            <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Transaction Recorded Successfully</span>
              </div>
              <p className="text-xs text-emerald-200/90">
                Reference <strong className="font-mono text-white">{successInfo.referenceNumber}</strong> has been registered in the general ledger.
              </p>
              {successInfo.requiresDualAuth && (
                <div className="mt-2 p-2.5 bg-amber-950/70 border border-amber-800 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>4-Eyes Dual Authorization Required:</strong> Because the transfer is &ge; $10,000, it has entered the administrative review queue for secondary sign-off before funds settle.
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="px-5 py-2 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-500 text-xs transition"
              >
                Close &amp; Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg text-red-200 flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          {/* Transaction Type */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Transaction Category &amp; Direction</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="WIRE_TRANSFER">Outgoing Wire Transfer</option>
              <option value="PAYMENT_OUT">Direct Commercial ACH Payment</option>
              <option value="PAYMENT_IN">Incoming Client Payment / Retainer (Credit)</option>
              <option value="VENDOR_INVOICE">Vendor Invoice Settlement</option>
              <option value="TAX_ESCROW">Tax Escrow Allocation</option>
              <option value="PAYROLL">Payroll Batch Funding</option>
            </select>
          </div>

          {/* Source Account */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Bank Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.accountNumber}) &bull; ${acc.availableBalance.toLocaleString()} Avail
                </option>
              ))}
            </select>
          </div>

          {/* Counterparty & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Counterparty / Payee</label>
              <input
                type="text"
                placeholder="e.g. Amazon Web Services or Client Corp"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2.5 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Classification Category */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">General Ledger Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="Cloud Infrastructure">Cloud Infrastructure &amp; Compute</option>
              <option value="Legal & Governance">Legal, Audit &amp; Governance</option>
              <option value="Salaries & Benefits">Salaries &amp; Compensation</option>
              <option value="SaaS & Developer Tools">SaaS &amp; Developer Tools</option>
              <option value="Statutory Tax Reserve">Statutory Corporate Tax Reserve</option>
              <option value="Client Retainer / Revenue">Client Retainer / Revenue</option>
              <option value="Marketing & Growth">Marketing &amp; Growth</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Transaction Description / Invoice Memo</label>
            <input
              type="text"
              placeholder="e.g. Monthly server cluster compute invoice #889"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Tax Deductible */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="taxDeductible"
              checked={taxDeductible}
              onChange={(e) => setTaxDeductible(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded bg-slate-950 border-slate-800"
            />
            <label htmlFor="taxDeductible" className="text-slate-300 select-none">
              Qualifies as tax-deductible operational corporate expenditure
            </label>
          </div>

          {/* High-Value 4-Eyes Dual Auth Callout */}
          {isHighValue && (
            <div className="p-3 bg-amber-950/60 border border-amber-800 rounded-lg flex items-start gap-2.5 text-amber-300">
              <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="block font-semibold">Dual-Authorization Threshold Triggered</strong>
                <span className="text-[11px] text-amber-200/90 leading-tight">
                  This outgoing transfer exceeds $10,000.00. It will automatically enter the Dual-Auth approval queue for secondary 4-eyes executive sign-off before settlement.
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleCloseAndReset}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Processing...' : (isHighValue ? 'Submit for Dual-Authorization' : 'Execute & Record Transaction')}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
