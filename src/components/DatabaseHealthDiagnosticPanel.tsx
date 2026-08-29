import React, { useState, useEffect } from 'react';
import { DatabaseHealthReport, DatabaseHealthIssue, AppConfig } from '../types';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  FileCheck,
  FileX,
  Lock,
  LockOpen,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  Zap,
  HardDrive,
  Info
} from 'lucide-react';
import { tauriBridge } from '../services/tauriService';
import { db } from '../services/db';

interface DatabaseHealthDiagnosticPanelProps {
  config: AppConfig;
  onRefreshData?: () => Promise<void>;
  compact?: boolean;
}

export const DatabaseHealthDiagnosticPanel: React.FC<DatabaseHealthDiagnosticPanelProps> = ({
  config,
  onRefreshData,
  compact = false
}) => {
  const [report, setReport] = useState<DatabaseHealthReport | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sharedPath = config.sharedFolderPath || '\\\\192.168.1.100\\QA_ReferenceTracker_Shared\\';

  const runDiagnosticScan = async () => {
    setIsScanning(true);
    setResetMessage(null);
    try {
      const result = await tauriBridge.scanDatabaseHealth(sharedPath);
      setReport(result);
    } catch (err: any) {
      console.error('Database health scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    runDiagnosticScan();
  }, [sharedPath]);

  const handleResetConnection = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      // 1. Purge stale locks and re-initialize network channel
      const resetRes = await tauriBridge.resetDatabaseConnection(sharedPath);

      // 2. Pull latest clean data from shared network folder or push clean state
      const pullRes = await db.pullFromSharedFolderNetwork(true);

      // 3. Re-start polling timer
      db.startSharedNetworkPolling();

      if (onRefreshData) {
        await onRefreshData();
      }

      // 4. Re-run scan to confirm health recovery
      await runDiagnosticScan();

      setResetMessage({
        type: 'success',
        text: resetRes.message || 'Database connection successfully reset and re-initialized!'
      });
    } catch (err: any) {
      setResetMessage({
        type: 'error',
        text: `Reset connection failed: ${err?.message || 'Error releasing lock'}`
      });
    } finally {
      setIsResetting(false);
    }
  };

  const getHealthBadge = (health?: string) => {
    switch (health) {
      case 'HEALTHY':
        return (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>DATABASE HEALTHY</span>
          </div>
        );
      case 'DEGRADED':
        return (
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>PERFORMANCE DEGRADED</span>
          </div>
        );
      case 'LOCKED':
        return (
          <div className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-xs font-bold flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>FILE LOCK DETECTED</span>
          </div>
        );
      case 'CORRUPTED':
        return (
          <div className="px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>CORRUPTION DETECTED</span>
          </div>
        );
      case 'UNREACHABLE':
      default:
        return (
          <div className="px-3.5 py-1.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 font-mono text-xs font-bold flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-red-400" />
            <span>NETWORK UNREACHABLE</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-[#141414] rounded-2xl border border-[#222] p-6 shadow-xl space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 text-purple-300 rounded-xl shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Database Health & Integrity Diagnostics</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Live automated scanning for file locks, connection latency timeouts, and serialization corruption.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {report && getHealthBadge(report.overallHealth)}

          <button
            type="button"
            onClick={runDiagnosticScan}
            disabled={isScanning}
            className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-gray-200 text-xs font-bold rounded-xl border border-[#333] transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
          </button>
        </div>
      </div>

      {/* Primary 4-Metric Diagnostic Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: File Lock Status */}
        <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-purple-400" />
              <span>File Lock Scan</span>
            </span>
            <span className="text-[10px] font-mono text-gray-500">SMB / Handle</span>
          </div>
          <div className="text-sm font-bold font-mono text-white flex items-center gap-2">
            {report?.fileLockStatus === 'NO_LOCKS' ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>No Locks (Clean)</span>
              </span>
            ) : report?.fileLockStatus === 'STALE_LOCK_FOUND' ? (
              <span className="text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Stale Lock Found</span>
              </span>
            ) : (
              <span className="text-purple-400 flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                <span>Active Lock</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            {report?.fileLockStatus === 'NO_LOCKS'
              ? 'Shared file is open for write access.'
              : 'Stale locks can block remote peer synchronization.'}
          </p>
        </div>

        {/* Metric 2: Connection Ping & Timeout */}
        <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-blue-400" />
              <span>Connection Latency</span>
            </span>
            <span className="text-[10px] font-mono text-gray-500">Ping</span>
          </div>
          <div className="text-sm font-bold font-mono text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className={report?.connectionTimeoutMs && report.connectionTimeoutMs > 500 ? 'text-amber-400' : 'text-blue-400'}>
              {report?.connectionTimeoutMs ?? 0} ms
            </span>
            <span className="text-[10px] text-gray-500 font-sans">
              ({(report?.connectionTimeoutMs ?? 0) < 50 ? 'Optimal' : (report?.connectionTimeoutMs ?? 0) < 200 ? 'Good' : 'High Latency'})
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            Measures response time reading network directory payload.
          </p>
        </div>

        {/* Metric 3: Integrity & Corruption Scan */}
        <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Database Integrity</span>
            </span>
            <span className="text-[10px] font-mono text-gray-500">Syntax</span>
          </div>
          <div className="text-sm font-bold font-mono text-white flex items-center gap-2">
            {report?.dbIntegrityStatus === 'VALID' ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" />
                <span>Schema Valid</span>
              </span>
            ) : report?.dbIntegrityStatus === 'CORRUPTED' || report?.dbIntegrityStatus === 'INVALID_JSON' ? (
              <span className="text-red-400 flex items-center gap-1.5">
                <FileX className="w-4 h-4" />
                <span>Corrupted</span>
              </span>
            ) : (
              <span className="text-blue-400 flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                <span>Uninitialized</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            {report?.recordCount ? `${report.recordCount} verified records in catalog` : 'Structure validated.'}
          </p>
        </div>

        {/* Metric 4: File Size & Last Writer Workstation */}
        <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Catalog Snapshot</span>
            </span>
            <span className="text-[10px] font-mono text-gray-500">Size</span>
          </div>
          <div className="text-sm font-bold font-mono text-white flex items-center gap-2">
            <span className="text-amber-400">{report?.dbFileSizeKb || 0} KB</span>
            <span className="text-[10px] text-gray-400 truncate">
              ({report?.lastWriterWorkstation || 'Peer PC'})
            </span>
          </div>
          <p className="text-[11px] text-gray-500 truncate">
            {report?.lastUpdatedTime ? new Date(report.lastUpdatedTime).toLocaleTimeString() : 'No updates logged'}
          </p>
        </div>
      </div>

      {/* Detected Health Issues & Recommendation List */}
      {report?.issues && report.issues.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Detected Diagnostic Issues ({report.issues.length})</span>
          </h4>

          <div className="space-y-2">
            {report.issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  issue.severity === 'HIGH'
                    ? 'bg-red-950/30 border-red-500/30 text-red-300'
                    : issue.severity === 'MEDIUM'
                    ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                    : 'bg-blue-950/30 border-blue-500/30 text-blue-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      issue.severity === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {issue.severity}
                    </span>
                    <span>{issue.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">{issue.details}</p>
                  {issue.recommendation && (
                    <p className="text-[11px] text-gray-400 font-mono">💡 Action: {issue.recommendation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset Connection Action Box */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-purple-950/30 to-blue-950/20 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-purple-400" />
            <span>Reset Connection & Re-Initialize Database Pipeline</span>
          </h4>
          <p className="text-[11px] text-gray-300 leading-relaxed max-w-2xl">
            Clears orphaned file locks, purges lingering SMB handles, re-validates database syntax, and re-establishes clean real-time multi-PC polling communication.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetConnection}
          disabled={isResetting}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting Connection...' : 'Reset Connection'}</span>
        </button>
      </div>

      {/* Reset Result Message Banner */}
      {resetMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
          resetMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {resetMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{resetMessage.text}</span>
        </div>
      )}
    </div>
  );
};
