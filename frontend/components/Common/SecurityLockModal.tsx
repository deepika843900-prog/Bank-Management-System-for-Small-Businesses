import { useState } from 'react';
import { Lock, Unlock, ShieldCheck, KeyRound, Fingerprint, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types';
import { StorageService } from '../../services/storageService';
import { BankingApiClient } from '../../services/apiClient';

interface Props {
  currentUser: UserProfile;
  isOpen: boolean;
  onUnlock: () => void;
}

export function SecurityLockModal({ currentUser, isOpen, onUnlock }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const errorMessages = [
    'Incorrect security PIN. Default terminal PIN is 1234.',
    'Authentication rejected: Invalid credential. Attempt logged to audit trail.',
    'Security warning: Multiple invalid attempts registered on active terminal.'
  ];

  const handleKeyClick = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        if (nextPin === '1234') {
          setTimeout(() => {
            onUnlock();
            setPin('');
            setError(false);
            setErrorMessage(null);
            setFailedAttempts(0);
          }, 250);
        } else {
          // Trigger alternating error state
          const newFailed = failedAttempts + 1;
          setFailedAttempts(newFailed);
          setError(true);
          const chosenError = errorMessages[(newFailed - 1) % errorMessages.length];
          setErrorMessage(chosenError);

          // Log security failure in audit logs
          const logPayload = {
            action: 'AUTH_PIN_FAILED',
            category: 'AUTH' as const,
            details: `Terminal unlock failed for ${currentUser.name} (${currentUser.role}). Invalid PIN attempt #${newFailed}.`,
            riskLevel: 'HIGH' as const,
            status: 'DENIED' as const
          };

          StorageService.addAuditLog({
            ...logPayload,
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            ipAddress: currentUser.ipAddress
          });

          BankingApiClient.recordAuditLog(logPayload, currentUser.id).catch(() => {});

          // Reset PIN after 600ms so user can try again
          setTimeout(() => {
            setPin('');
          }, 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handleBiometricUnlock = () => {
    onUnlock();
    setPin('');
    setError(false);
    setErrorMessage(null);
    setFailedAttempts(0);
  };

  const handleFillDemoPin = () => {
    setPin('1234');
    setError(false);
    setTimeout(() => {
      onUnlock();
      setPin('');
      setErrorMessage(null);
      setFailedAttempts(0);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`bg-slate-900 border ${error ? 'border-red-500/80 shadow-red-950/50' : 'border-slate-800'} rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-5 transition-all`}>
        <div className={`mx-auto w-14 h-14 rounded-2xl ${error ? 'bg-red-950/80 border-red-800 text-red-400 animate-pulse' : 'bg-indigo-950/80 border-indigo-800 text-indigo-400'} border flex items-center justify-center shadow-md transition-colors`}>
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">Session Security Lock</h3>
          <p className="text-xs text-slate-400 mt-1">
            Banking terminal for <span className="text-slate-200 font-medium">{currentUser.name}</span> ({currentUser.role})
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3 my-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                error
                  ? 'bg-red-500 border-red-400 scale-110 shadow-sm shadow-red-500/50'
                  : pin.length > idx 
                    ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-sm shadow-indigo-500/50' 
                    : 'border-slate-700 bg-slate-950'
              }`}
            />
          ))}
        </div>

        {/* Dynamic Alternating Error Notification */}
        {errorMessage ? (
          <div className="p-2.5 bg-red-950/80 border border-red-800/80 rounded-lg text-red-200 text-[11px] flex items-center justify-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            Enter 4-digit security PIN (default: <span className="font-mono text-slate-400 font-medium">1234</span>)
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyClick(num)}
              className="w-16 h-12 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-lg font-semibold hover:bg-slate-800 transition active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            className="w-16 h-12 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition active:scale-95"
          >
            Del
          </button>
          <button
            onClick={() => handleKeyClick('0')}
            className="w-16 h-12 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-lg font-semibold hover:bg-slate-800 transition active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleBiometricUnlock}
            title="Biometric Passkey Touch"
            className="w-16 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800 text-indigo-400 hover:bg-indigo-900/60 transition flex items-center justify-center active:scale-95"
          >
            <Fingerprint className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Bypass */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
          <button
            onClick={handleFillDemoPin}
            className="text-indigo-400 hover:text-indigo-300 underline font-mono text-[11px]"
          >
            Demo Auto-Fill (1234)
          </button>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hardware Token</span>
          </div>
        </div>
      </div>
    </div>
  );
}
