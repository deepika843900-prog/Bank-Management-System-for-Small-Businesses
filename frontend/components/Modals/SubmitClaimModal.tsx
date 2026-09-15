import { useState, type FormEvent } from 'react';
import { X, UploadCloud, Receipt, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { UserProfile, ExpenseClaim } from '../../types';
import { StorageService } from '../../services/storageService';
import { BankingApiClient } from '../../services/apiClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSuccess: () => void;
}

export function SubmitClaimModal({
  isOpen,
  onClose,
  currentUser,
  onSuccess
}: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseClaim['category']>('TRAVEL');
  const [amountStr, setAmountStr] = useState('');
  const [dateIncurred, setDateIncurred] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('uber_receipt_inv.pdf');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedClaim, setSubmittedClaim] = useState<ExpenseClaim | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const amount = parseFloat(amountStr);

    if (!title.trim() || isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid title and positive amount.');
      return;
    }

    if (amount > 25000) {
      setErrorMessage('Single expense claim cannot exceed company policy threshold ($25,000.00).');
      return;
    }

    setIsSubmitting(true);

    try {
      await BankingApiClient.submitClaim({
        employee: currentUser,
        title: title.trim(),
        category,
        amount,
        dateIncurred,
        description: description.trim(),
        receiptName: receiptFileName
      });
    } catch {
      // Local fallback
    }

    const claim = StorageService.submitExpenseClaim({
      employee: currentUser,
      title: title.trim(),
      category,
      amount,
      dateIncurred,
      description: description.trim(),
      receiptName: receiptFileName
    });

    setIsSubmitting(false);
    onSuccess();
    setSubmittedClaim(claim);
  };

  const handleCloseAndReset = () => {
    setErrorMessage(null);
    setSubmittedClaim(null);
    setTitle('');
    setAmountStr('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Submit Reimbursement Claim</h3>
          </div>
          <button onClick={handleCloseAndReset} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedClaim ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Reimbursement Claim Dispatched</span>
              </div>
              <p className="text-xs text-emerald-200/90">
                Claim <strong className="font-mono text-white">{submittedClaim.claimNumber}</strong> for <strong className="text-white">${submittedClaim.amount.toFixed(2)}</strong> has been routed to the Accountant review queue.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="px-5 py-2 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-500 text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {errorMessage && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg text-red-200 flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">Expense Title</label>
              <input
                type="text"
                placeholder="e.g. Flight to Developer Summit / Client Dinner"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseClaim['category'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="TRAVEL">Travel &amp; Lodging</option>
                  <option value="MEALS">Client Meals &amp; Catering</option>
                  <option value="SOFTWARE">Software &amp; Subscriptions</option>
                  <option value="HARDWARE">Hardware &amp; Equipment</option>
                  <option value="TRAINING">Conferences &amp; Training</option>
                  <option value="OFFICE">Office Supplies</option>
                  <option value="OTHER">Other Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Date Incurred</label>
              <input
                type="date"
                value={dateIncurred}
                onChange={(e) => setDateIncurred(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Business Purpose / Notes</label>
              <textarea
                placeholder="Explain how this expense was necessary for company business..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Receipt Attachment Simulation */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Attached Receipt / Tax Invoice</label>
              <div className="border-2 border-dashed border-slate-800 rounded-xl p-3 text-center bg-slate-950/60 hover:bg-slate-950 transition cursor-pointer">
                <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <div className="text-[11px] text-slate-300 font-medium">{receiptFileName}</div>
                <div className="text-[10px] text-slate-500">PDF, PNG, JPEG up to 10MB</div>
              </div>
            </div>

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
                className="px-5 py-2 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
