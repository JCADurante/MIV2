import React, { useState, useEffect } from 'react';
import { AppConfig, StorageMode, SharedPathCheckResult } from '../types';
import {
  Network,
  HardDrive,
  FolderOpen,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Check,
  Info,
  Database,
  BookOpen,
  Sparkles,
  ArrowRight,
  Zap,
  Clock
} from 'lucide-react';
import { tauriBridge } from '../services/tauriService';
import { db } from '../services/db';
import { realtimeSync } from '../services/realtimeSync';
import { DatabaseHealthDiagnosticPanel } from './DatabaseHealthDiagnosticPanel';
import { SharedFolderHelpModal } from './SharedFolderHelpModal';

interface SharedNetworkStoragePanelProps {
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => Promise<void>;
  onRefreshData?: () => Promise<void>;
  compact?: boolean;
}

export const SharedNetworkStoragePanel: React.FC<SharedNetworkStoragePanelProps> = ({
  config,
  onConfigChange,
  onRefreshData,
  compact = false
}) => {
  const [storageMode, setStorageMode] = useState<StorageMode>(config.storageMode || 'LOCAL');
  const [sharedPath, setSharedPath] = useState(config.sharedFolderPath || '\\\\192.168.1.100\\QA_ReferenceTracker_Shared\\');
  const [syncEnabled, setSyncEnabled] = useState(config.sharedFolderSyncEnabled ?? true);
  const [autoSyncInterval, setAutoSyncInterval] = useState(config.autoSyncIntervalSec || 2);

  const [isCheckingPath, setIsCheckingPath] = useState(false);
  const [checkResult, setCheckResult] = useState<SharedPathCheckResult | null>(config.sharedPathCheckResult || null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    if (config.storageMode) setStorageMode(config.storageMode);
    if (config.sharedFolderPath) setSharedPath(config.sharedFolderPath);
    if (config.sharedFolderSyncEnabled !== undefined) setSyncEnabled(config.sharedFolderSyncEnabled);
    if (config.autoSyncIntervalSec !== undefined) setAutoSyncInterval(config.autoSyncIntervalSec);
    if (config.sharedPathCheckResult) setCheckResult(config.sharedPathCheckResult);
  }, [config]);

  // One-click Link & Activate Shared Database
  const handleConnectSharedPath = async (targetPathToUse?: string) => {
    const raw = targetPathToUse !== undefined ? targetPathToUse : sharedPath;
    const target = (raw || '').trim();
    if (!target) {
      setStatusMsg({
        type: 'error',
        text: 'Please enter a shared folder path (e.g. Z:\\ or \\\\192.168.1.100\\QA_ReferenceTracker_Shared\\).'
      });
      return;
    }

    setIsCheckingPath(true);
    setStatusMsg({
      type: 'info',
      text: `Connecting and loading database from shared folder: "${target}"...`
    });

    try {
      // 1. Run diagnostic test
      const diag = await db.checkSharedFolderPath(target);
      setCheckResult(diag);

      // 2. Set mode to SHARED_NETWORK and trigger immediate sync / read
      const res = await db.setSharedNetworkMode(true, target);

      // 3. Update config in parent
      await onConfigChange({
        storageMode: 'SHARED_NETWORK',
        sharedFolderPath: target,
        sharedFolderSyncEnabled: true,
        autoSyncIntervalSec: Number(autoSyncInterval) || 2,
        sharedPathCheckResult: diag
      });

      if (onRefreshData) await onRefreshData();

      setStatusMsg({
        type: 'success',
        text: res.message || `Successfully linked to shared folder database: "${target}". Direct read, direct write, and real-time 2-second background sync are active.`
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Connection error: ${err?.message || 'Failed to connect to network share'}`
      });
    } finally {
      setIsCheckingPath(false);
    }
  };

  const handleRunDiagnosticsOnly = async () => {
    const target = (sharedPath || '').trim();
    if (!target) {
      setStatusMsg({
        type: 'error',
        text: 'Please enter a network folder path before testing.'
      });
      return;
    }

    setIsCheckingPath(true);
    setStatusMsg({
      type: 'info',
      text: `Testing network path accessibility: "${target}"...`
    });

    try {
      const res = await db.checkSharedFolderPath(target);
      setCheckResult(res);
      if (res.status === 'CONNECTED') {
        setStatusMsg({
          type: 'success',
          text: `Diagnostic Passed! Network path "${target}" is fully accessible with Read and Write permissions.`
        });
      } else if (res.status === 'READ_ONLY') {
        setStatusMsg({
          type: 'info',
          text: `Path is accessible for Reading, but Write access is denied. Check network share write permissions.`
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: res.errorMessage || `Path check failed: Could not access "${target}". Check Windows Network Sharing settings.`
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Diagnostic failed: ${err?.message || 'Network unreachable'}`
      });
    } finally {
      setIsCheckingPath(false);
    }
  };

  const handleModeChange = async (newMode: StorageMode) => {
    setStorageMode(newMode);
    try {
      if (newMode === 'SHARED_NETWORK') {
        await handleConnectSharedPath();
      } else {
        await db.setSharedNetworkMode(false);
        await onConfigChange({
          storageMode: 'LOCAL',
          sharedFolderSyncEnabled: false
        });
        setStatusMsg({
          type: 'success',
          text: 'Switched to Standalone Local Mode. Database is saved in \\ReferenceTracker_Data\\ beside MIRMS.exe.'
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Failed to update mode: ${err?.message}` });
    }
  };

  const handleForceReload = async () => {
    setIsSyncingNow(true);
    setStatusMsg(null);
    try {
      const res = await db.pullFromSharedFolderNetwork(true);
      if (res.success) {
        if (onRefreshData) await onRefreshData();
        setStatusMsg({
          type: 'success',
          text: res.message
        });
      } else {
        setStatusMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Reload failed: ${err?.message}` });
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleOpenLocalFolder = async () => {
    try {
      const opened = await tauriBridge.openDataFolder('Application Data/ReferenceTracker_Data/');
      setStatusMsg({ type: 'info', text: `Opened local data directory beside EXE: ${opened}` });
    } catch (e: any) {
      console.error(e);
    }
  };

  const isSharedConnected = storageMode === 'SHARED_NETWORK' && (checkResult?.status === 'CONNECTED' || (config.lastSharedSyncStatus === 'CONNECTED'));

  return (
    <div className="bg-[#141414] rounded-2xl border border-[#222] p-6 shadow-xl space-y-6 select-none">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-xl shrink-0">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Shared Folder Database — Direct Read & Write with Real-Time Sync</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Reads and writes data directly to the shared folder database. All connected workstations stay synchronized in real time.
            </p>
          </div>
        </div>

        {/* Live Network Status Badge & Guide Button */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Folder Setup Guide</span>
          </button>

          {storageMode === 'SHARED_NETWORK' ? (
            <span
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                isSharedConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : checkResult?.status === 'READ_ONLY'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSharedConnected ? 'bg-emerald-400 animate-pulse' : checkResult?.status === 'READ_ONLY' ? 'bg-amber-400' : 'bg-red-500'
                }`}
              />
              <span>
                {isSharedConnected
                  ? 'SHARED DATABASE LIVE'
                  : checkResult?.status === 'READ_ONLY'
                  ? 'SHARED READ-ONLY'
                  : 'DISCONNECTED'}
              </span>
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl border border-[#333] bg-[#1A1A1A] text-gray-300 text-xs font-mono font-bold flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>STANDALONE LOCAL (BESIDE EXE)</span>
            </span>
          )}
        </div>
      </div>

      {/* Storage Mode Selector (Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: Shared Network Folder Mode (Recommended) */}
        <div
          onClick={() => handleModeChange('SHARED_NETWORK')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            storageMode === 'SHARED_NETWORK'
              ? 'bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/50 shadow-lg'
              : 'bg-[#181818] border-[#2A2A2A] hover:border-[#3A3A3A] opacity-75'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg border ${
                  storageMode === 'SHARED_NETWORK'
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-[#222] border-[#333] text-gray-400'
                }`}
              >
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Shared Network Database (Direct Read/Write)</span>
                  {storageMode === 'SHARED_NETWORK' && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      Active
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Reads and writes directly to <code className="text-emerald-400 font-mono">shared_material_reference.json</code>
                </p>
              </div>
            </div>
            <input
              type="radio"
              name="storageMode"
              checked={storageMode === 'SHARED_NETWORK'}
              onChange={() => handleModeChange('SHARED_NETWORK')}
              className="mt-1 text-emerald-500 focus:ring-emerald-500"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed border-t border-[#222] pt-2">
            Multi-PC environment: any item added, edited, or approved is saved directly to the shared folder, and peer workstations update automatically in real time.
          </p>
        </div>

        {/* Option 2: Standalone Local Mode */}
        <div
          onClick={() => handleModeChange('LOCAL')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            storageMode === 'LOCAL'
              ? 'bg-blue-950/20 border-blue-500/60 ring-1 ring-blue-500/50 shadow-lg'
              : 'bg-[#181818] border-[#2A2A2A] hover:border-[#3A3A3A] opacity-75'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg border ${
                  storageMode === 'LOCAL'
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                    : 'bg-[#222] border-[#333] text-gray-400'
                }`}
              >
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Standalone Local Mode</span>
                  {storageMode === 'LOCAL' && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      Active
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Saved in <code className="text-blue-400 font-mono">.\ReferenceTracker_Data\</code> beside <code className="text-gray-300 font-mono">MIRMS.exe</code>
                </p>
              </div>
            </div>
            <input
              type="radio"
              name="storageMode"
              checked={storageMode === 'LOCAL'}
              onChange={() => handleModeChange('LOCAL')}
              className="mt-1 text-blue-500 focus:ring-blue-500"
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed border-t border-[#222] pt-2">
            Single PC only. Stores all data on the local hard drive beside the executable without multi-workstation networking.
          </p>
        </div>
      </div>

      {/* Shared Network Configuration & Real-Time Sync Center */}
      {storageMode === 'SHARED_NETWORK' ? (
        <div className="space-y-5 bg-[#0D0D0D] p-5 rounded-xl border border-[#222]">
          {/* Shared Folder Path Input & 1-Click Connect Button */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-emerald-400" />
                <span>Shared Folder Location (UNC Network Share or Mapped Drive)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                Direct Read/Write Target
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={sharedPath}
                  onChange={(e) => setSharedPath(e.target.value)}
                  placeholder="e.g. Z:\ or \\192.168.1.100\QA_ReferenceTracker_Shared\"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:outline-hidden focus:border-emerald-500 transition-all shadow-inner"
                />
              </div>

              <button
                type="button"
                onClick={() => handleConnectSharedPath()}
                disabled={isCheckingPath}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 shadow-md cursor-pointer"
              >
                <Zap className={`w-4 h-4 text-amber-300 ${isCheckingPath ? 'animate-spin' : ''}`} />
                <span>{isCheckingPath ? 'Connecting...' : 'Connect & Sync Shared Database'}</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 pt-1">
              <span className="text-gray-500 font-semibold">Quick Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setSharedPath('Z:\\');
                  handleConnectSharedPath('Z:\\');
                }}
                className="px-2.5 py-1 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333] hover:border-emerald-500/50 rounded-lg font-mono text-[10px] text-emerald-400 cursor-pointer"
              >
                Mapped Drive: Z:\
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = '\\\\192.168.1.100\\QA_ReferenceTracker_Shared\\';
                  setSharedPath(p);
                  handleConnectSharedPath(p);
                }}
                className="px-2.5 py-1 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333] hover:border-emerald-500/50 rounded-lg font-mono text-[10px] text-emerald-400 cursor-pointer"
              >
                UNC: \\192.168.1.100\QA_ReferenceTracker_Shared\
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = 'C:\\QA_ReferenceTracker_Shared\\';
                  setSharedPath(p);
                  handleConnectSharedPath(p);
                }}
                className="px-2.5 py-1 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333] hover:border-emerald-500/50 rounded-lg font-mono text-[10px] text-emerald-400 cursor-pointer"
              >
                Host Local: C:\QA_ReferenceTracker_Shared\
              </button>
            </div>
          </div>

          {/* Direct Read/Write Real-Time Status Card */}
          <div className="p-4 rounded-xl border bg-emerald-950/20 border-emerald-500/30 text-gray-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-900/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <h4 className="text-xs font-bold text-white">
                  Direct Read & Write Status: <span className="text-emerald-400">Live Active</span>
                </h4>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>Polling every {autoSyncInterval}s</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#161616] border border-[#262626]">
                <div className="text-[10px] text-gray-400 font-sans">Database File</div>
                <div className="font-bold text-[11px] text-white truncate" title={`${sharedPath}shared_material_reference.json`}>
                  shared_material_reference.json
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#161616] border border-[#262626]">
                <div className="text-[10px] text-gray-400 font-sans">Read Workflow</div>
                <div className="font-bold text-[11px] text-emerald-400">
                  Direct from Shared File
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#161616] border border-[#262626]">
                <div className="text-[10px] text-gray-400 font-sans">Write Workflow</div>
                <div className="font-bold text-[11px] text-emerald-400">
                  Instant Save to Share
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#161616] border border-[#262626]">
                <div className="text-[10px] text-gray-400 font-sans">Real-Time Sync</div>
                <div className="font-bold text-[11px] text-emerald-400 flex items-center gap-1">
                  <span>Auto Every {autoSyncInterval}s</span>
                </div>
              </div>
            </div>

            {/* Simplicity Reassurance Note */}
            <div className="p-3 bg-[#161616] rounded-lg border border-emerald-500/20 text-xs text-gray-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-semibold">Zero-Effort Automatic Sync:</strong>{' '}
                <span>
                  Everything you read or write operates directly on the shared folder database. Whenever an inspector adds, updates, or approves a reference on any PC, all workstations reflect the changes automatically within {autoSyncInterval} seconds.
                </span>
              </div>
            </div>

            {config.lastSharedSyncTime && (
              <p className="text-[10px] font-mono text-gray-400 flex items-center justify-between pt-1">
                <span>Last Synced: {new Date(config.lastSharedSyncTime).toLocaleTimeString()}</span>
                <span>Workstation: {config.workstationName || 'Current PC'}</span>
              </p>
            )}
          </div>

          {/* Sync Frequency and Secondary Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#222]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleForceReload}
                disabled={isSyncingNow}
                className="px-3.5 py-2 bg-[#222] hover:bg-[#2A2A2A] text-gray-200 text-xs font-semibold rounded-xl border border-[#333] transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Manually re-read the shared folder database right now"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingNow ? 'animate-spin' : ''}`} />
                <span>{isSyncingNow ? 'Reading Share...' : 'Force Reload from Share'}</span>
              </button>

              <button
                type="button"
                onClick={handleRunDiagnosticsOnly}
                disabled={isCheckingPath}
                className="px-3.5 py-2 bg-[#1B1B1B] hover:bg-[#252525] text-gray-300 text-xs font-semibold rounded-xl border border-[#333] transition-all flex items-center gap-1.5 cursor-pointer"
                title="Test read and write permissions to the shared path"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Test Permissions</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Heartbeat:</span>
              <select
                value={autoSyncInterval}
                onChange={async (e) => {
                  const val = Number(e.target.value);
                  setAutoSyncInterval(val);
                  await onConfigChange({ autoSyncIntervalSec: val });
                }}
                className="px-2.5 py-1 text-xs bg-[#1C1C1C] border border-[#333] text-white rounded-lg focus:outline-hidden focus:border-emerald-500 font-mono"
              >
                <option value={1}>1 Second (Ultra-Fast)</option>
                <option value={2}>2 Seconds (Recommended)</option>
                <option value={5}>5 Seconds (Standard)</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        /* Standalone Local Mode Info Box */
        <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#222] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Local Storage Location Beside EXE</span>
            </span>
            <button
              type="button"
              onClick={handleOpenLocalFolder}
              className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#333] text-gray-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Open Local Folder Beside EXE</span>
            </button>
          </div>

          <div className="bg-[#161616] p-3 rounded-lg border border-[#262626] font-mono text-xs text-blue-300">
            .\ReferenceTracker_Data\database\material_reference.db
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            In Standalone Local Mode, all master catalog records, inspection registrations, photos, and Word document templates are stored directly beside <code className="text-gray-200 font-mono">MIRMS.exe</code> inside the <code className="text-blue-400 font-mono">ReferenceTracker_Data</code> folder.
          </p>
        </div>
      )}

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : statusMsg.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : statusMsg.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Embedded Database Health Diagnostic Tool */}
      <DatabaseHealthDiagnosticPanel
        config={config}
        onRefreshData={onRefreshData}
      />

      {/* Interactive Step-by-Step Shared Folder Setup & Troubleshooting Guide Modal */}
      <SharedFolderHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        currentPath={sharedPath}
        onApplyPresetPath={(p) => {
          setSharedPath(p);
          handleConnectSharedPath(p);
        }}
      />
    </div>
  );
};
