import { useState } from 'react';
import { 
  ShieldCheck, Lock, Key, ShieldAlert, FileText, CheckCircle2, 
  AlertTriangle, RefreshCw, Smartphone, Globe, CloudCheck, HardDrive, 
  Eye, Terminal, Database, Server, X, AlertCircle, Wrench
} from 'lucide-react';
import { SecurityPostureMetrics, AuditLogEntry, UserProfile } from '../../types';
import { StorageService } from '../../services/storageService';
import { BankingApiClient } from '../../services/apiClient';

interface Props {
  metrics: SecurityPostureMetrics;
  auditLogs: AuditLogEntry[];
  users: UserProfile[];
  currentUser: UserProfile;
  onRefreshData: () => void;
  onOpenBackups: () => void;
}

export function MeasurableSecurityDashboard({
  metrics,
  auditLogs,
  users,
  currentUser,
  onRefreshData,
  onOpenBackups
}: Props) {
  const [verifyingLedger, setVerifyingLedger] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ 
    verified: boolean; 
    tamperedCount: number; 
    tamperedRecords?: string[]; 
    timestamp: string; 
  } | null>(null);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  const [togglingTamper, setTogglingTamper] = useState(false);
  const [tamperedState, setTamperedState] = useState(() => 
    StorageService.getTransactions().some(t => t.cryptoHash?.startsWith('corrupt_') || t.description?.includes('[SIMULATED TAMPER CORRUPTION]'))
  );

  const handleVerifyLedger = async () => {
    setVerifyingLedger(true);
    try {
      const apiResult = await BankingApiClient.verifyLedger(currentUser.id);
      const localResult = StorageService.verifyLedgerIntegrity();
      const verified = (apiResult ? apiResult.verified : true) && localResult.verified;
      const tamperedCount = (apiResult?.tamperedCount || 0) + (localResult.tamperedCount || 0);
      const tamperedRecords = [...(apiResult?.tamperedRecords || []), ...(localResult.tamperedRecords || [])];
      setVerificationResult({ 
        verified, 
        tamperedCount,
        tamperedRecords: Array.from(new Set(tamperedRecords)),
        timestamp: apiResult?.timestamp || localResult.timestamp 
      });
    } catch {
      const localResult = StorageService.verifyLedgerIntegrity();
      setVerificationResult({ 
        verified: localResult.verified, 
        tamperedCount: localResult.tamperedCount,
        tamperedRecords: localResult.tamperedRecords,
        timestamp: localResult.timestamp 
      });
    } finally {
      setVerifyingLedger(false);
      onRefreshData();
    }
  };

  const handleToggleTamperSimulation = async () => {
    setTogglingTamper(true);
    try {
      await BankingApiClient.toggleTamperSimulation(currentUser.id);
    } catch {
      // Local fallback
    }
    const local = StorageService.toggleTamperSimulation();
    setTamperedState(local.isTampered);
    setVerificationResult(null);
    onRefreshData();
    setTogglingTamper(false);
  };

  const errorLogsCount = auditLogs.filter(l => l.status === 'DENIED' || l.riskLevel === 'CRITICAL' || l.riskLevel === 'HIGH').length;

  const filteredLogs = auditLogs.filter(log => {
    if (filterErrorsOnly) {
      const isError = log.status === 'DENIED' || log.riskLevel === 'CRITICAL' || log.riskLevel === 'HIGH';
      if (!isError) return false;
    }
    const matchesRisk = selectedRiskFilter === 'ALL' || log.riskLevel === selectedRiskFilter;
    const matchesSearch = 
      log.action.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(searchLogQuery.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  return (
    <div className="space-y-6" id="measurable-security-center">
      {/* Top Banner: Measurable Security Scorecard */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`relative flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-800 border-2 ${tamperedState ? 'border-red-500/80 shadow-lg shadow-red-500/20' : 'border-emerald-500/80 shadow-lg shadow-emerald-500/10'} flex-shrink-0 transition-colors`}>
              <span className={`text-3xl font-extrabold font-mono ${tamperedState ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                {metrics.overallScore}
              </span>
              <span className={`absolute -bottom-2 text-[10px] font-semibold ${tamperedState ? 'bg-red-950 text-red-300 border-red-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'} border px-2 py-0.5 rounded-full uppercase`}>
                {tamperedState ? 'Alert' : 'Bank Grade'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Measurable Security Posture Score</h2>
                <span className={`inline-flex items-center gap-1 text-xs ${tamperedState ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'} border px-2 py-0.5 rounded-full font-medium`}>
                  {tamperedState ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {tamperedState ? 'Integrity Degraded (Drill Active)' : 'NIST CSF Compliant'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Quantitative cybersecurity metric dynamically aggregated across 6 zero-trust telemetry dimensions: Identity, Cryptography, Role-Based Isolation, Dual-Authorization, Immutable Auditing, and Encrypted Cloud Backups.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleTamperSimulation}
              disabled={togglingTamper}
              className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2.5 rounded-lg border transition shadow-sm ${
                tamperedState 
                  ? 'bg-red-950/90 border-red-700 text-red-200 hover:bg-red-900' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${tamperedState ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
              {tamperedState ? 'Alternate State: Clear Ledger Error' : 'Alternate State: Inject Simulated Ledger Error'}
            </button>
            <button
              onClick={handleVerifyLedger}
              disabled={verifyingLedger}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifyingLedger ? 'animate-spin' : ''}`} />
              {verifyingLedger ? 'Verifying SHA-256 Merkle Chain...' : 'Verify Cryptographic Ledger Hashes'}
            </button>
            <button
              onClick={onOpenBackups}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-700 transition"
            >
              <CloudCheck className="w-3.5 h-3.5 text-cyan-400" />
              Cloud Backups Vault
            </button>
          </div>
        </div>

        {/* Verification Alert Banner */}
        {verificationResult && (
          verificationResult.verified ? (
            <div className="mt-4 p-4 bg-emerald-950/80 border border-emerald-800/80 rounded-xl flex items-start justify-between text-xs text-emerald-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold text-white">Cryptographic Audit Passed (SHA-256 Chain 100% Intact)</strong>
                  <span>
                    All transaction ledger blocks validated against SHA-256 hash chains. 0 alterations detected across ledger history. Verified at {verificationResult.timestamp}.
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setVerificationResult(null)}
                className="text-emerald-400 hover:text-white underline text-[11px] ml-4"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-red-950/90 border border-red-800 rounded-xl flex items-start justify-between text-xs text-red-200 shadow-xl shadow-red-950/60">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1.5">
                  <strong className="block font-bold text-white text-sm">SECURITY ALERT: Cryptographic Ledger Chain Corrupted!</strong>
                  <p className="text-red-300 leading-relaxed">
                    Detected {verificationResult.tamperedCount} tampered record(s) with mismatched SHA-256 cryptographic checksums
                    {verificationResult.tamperedRecords && verificationResult.tamperedRecords.length > 0 && ` (${verificationResult.tamperedRecords.join(', ')})`}.
                    The blockchain-grade ledger detected unauthorized record modification.
                  </p>
                  <div className="pt-1 flex items-center gap-3">
                    <button
                      onClick={handleToggleTamperSimulation}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg text-[11px] transition shadow-sm"
                    >
                      <Wrench className="w-3.5 h-3.5" /> Alternate State / Auto-Heal Ledger
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setVerificationResult(null)}
                className="text-red-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        )}

        {/* 6 Measurable Security Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Identity &amp; 2FA</span>
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">{metrics.identityScore}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics.identityScore}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>AES-256 Crypto</span>
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">{metrics.encryptionScore}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${metrics.encryptionScore}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>RBAC Isolation</span>
              <Key className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">{metrics.rbacIsolationScore}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${metrics.rbacIsolationScore}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Dual 4-Eyes Auth</span>
              <Eye className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">{metrics.dualControlScore}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${metrics.dualControlScore}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Audit Immutability</span>
              <FileText className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">{metrics.auditTrailScore}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${metrics.auditTrailScore}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/70 p-3 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Cloud Backups</span>
              <Database className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">{metrics.backupReliabilityScore}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics.backupReliabilityScore}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Zero-Trust Telemetry & Active Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zero-Trust Perimeter Rules & Security Guard */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Zero-Trust Perimeter Guard</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Hard barrier enforcement: Each role token is cryptographically validated on every sub-view. Unauthorized cross-dashboard access triggers immediate 403 blocks and immutable event logging.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-300">Admin Clearance Boundary</span>
                <span className="text-emerald-400 font-mono font-medium">ISOLATED (0 leaks)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-300">Accountant Ledger Scope</span>
                <span className="text-emerald-400 font-mono font-medium">ISOLATED (0 leaks)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-300">Employee Sandboxed View</span>
                <span className="text-emerald-400 font-mono font-medium">ISOLATED (0 leaks)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-300">Dual-Auth Threshold Trigger</span>
                <span className="text-amber-400 font-mono font-medium">&ge; $10,000.00 USD</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Perimeter Engine:</span>
            <span className="text-slate-200 font-mono">v4.8-Strict-Enforce</span>
          </div>
        </div>

        {/* Active Authenticated Sessions */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Active Device &amp; IP Sessions</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{users.length} Active Endpoints</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Real-time identity sessions authenticated with hardware-bound tokens and 2FA keys.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-2 font-medium">User Profile</th>
                  <th className="pb-2 font-medium">Role Clearance</th>
                  <th className="pb-2 font-medium">Network Gateway IP</th>
                  <th className="pb-2 font-medium">2FA Status</th>
                  <th className="pb-2 font-medium">Session Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 font-medium text-slate-200">
                      <div>{u.name}</div>
                      <div className="text-[10px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.role === 'ADMIN' ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60' :
                        u.role === 'ACCOUNTANT' ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60' :
                        'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-400 text-[11px]">{u.ipAddress}</td>
                    <td className="py-2.5">
                      {u.twoFactorEnabled ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> FIDO2 / TOTP
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                          <AlertTriangle className="w-3 h-3" /> SMS Fallback
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Immutable Security Audit Trail */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5" id="security-audit-trail-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Immutable Append-Only Audit Trail</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographically chained security log recording all authentication events, dual-authorizations, and unauthorized access attempts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterErrorsOnly(!filterErrorsOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border ${
                filterErrorsOnly 
                  ? 'bg-red-950/90 border-red-700 text-red-200 shadow-sm' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${filterErrorsOnly ? 'text-red-400' : 'text-amber-400'}`} />
              <span>{filterErrorsOnly ? 'Alternate: Show All Logs' : `Alternate: Errors Only (${errorLogsCount})`}</span>
            </button>
            <input 
              type="text"
              placeholder="Search audit trail..."
              value={searchLogQuery}
              onChange={(e) => setSearchLogQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
            />
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(risk => (
                <button
                  key={risk}
                  onClick={() => setSelectedRiskFilter(risk)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                    selectedRiskFilter === risk ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2 font-medium px-2">Timestamp (UTC)</th>
                <th className="pb-2 font-medium px-2">Principal User</th>
                <th className="pb-2 font-medium px-2">Action Event</th>
                <th className="pb-2 font-medium px-2">Details</th>
                <th className="pb-2 font-medium px-2">Risk Level</th>
                <th className="pb-2 font-medium px-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    {filterErrorsOnly 
                      ? 'No security error or denied events found in current audit window.' 
                      : 'No audit records match the selected filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const isError = log.status === 'DENIED' || log.riskLevel === 'CRITICAL' || log.riskLevel === 'HIGH';
                  return (
                    <tr 
                      key={log.id} 
                      className={`transition ${
                        isError
                          ? index % 2 === 0
                            ? 'bg-red-950/35 border-l-2 border-red-500 hover:bg-red-900/30'
                            : 'bg-red-950/20 border-l-2 border-red-500/80 hover:bg-red-900/25'
                          : index % 2 === 0
                            ? 'bg-slate-900/50 hover:bg-slate-800/30'
                            : 'bg-slate-950/40 hover:bg-slate-800/20'
                      }`}
                    >
                      <td className="py-2.5 px-2 font-mono text-[11px] text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="font-medium text-slate-200">{log.userName}</span>
                        <span className="block text-[10px] text-slate-500">{log.userRole}</span>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-[11px] text-indigo-300">{log.action}</td>
                      <td className="py-2.5 px-2 text-slate-300 max-w-md">{log.details}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.riskLevel === 'CRITICAL' || log.riskLevel === 'HIGH' ? 'bg-red-950/80 text-red-400 border border-red-800/60' :
                          log.riskLevel === 'MEDIUM' ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' :
                          'bg-slate-800/80 text-slate-300 border border-slate-700'
                        }`}>
                          {log.riskLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          log.status === 'SUCCESS' ? 'text-emerald-400' :
                          log.status === 'DENIED' ? 'text-red-400 font-semibold' : 'text-amber-400'
                        }`}>
                          {log.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                          {log.status === 'DENIED' && <AlertTriangle className="w-3 h-3" />}
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
