import React, { useState, useEffect } from 'react';
import { AppConfig, StorageMode, SharedPathCheckResult } from '../types';
import { Network, HardDrive, FolderOpen, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Check, Clock, Wifi, Info, Zap, Server, Database } from 'lucide-react';
import { tauriBridge } from '../services/tauriService';
import { db } from '../services/db';
import { realtimeSync } from '../services/realtimeSync';
import { DatabaseHealthDiagnosticPanel } from './DatabaseHealthDiagnosticPanel';

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
  const [autoSyncInterval, setAutoSyncInterval] = useState(config.autoSyncIntervalSec || 3);
  
  const [isCheckingPath, setIsCheckingPath] = useState(false);
  const [checkResult, setCheckResult] = useState<SharedPathCheckResult | null>(config.sharedPathCheckResult || null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isPushingNow, setIsPushingNow] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (config.storageMode) setStorageMode(config.storageMode);
    if (config.sharedFolderPath) setSharedPath(config.sharedFolderPath);
    if (config.sharedFolderSyncEnabled !== undefined) setSyncEnabled(config.sharedFolderSyncEnabled);
    if (config.autoSyncIntervalSec !== undefined) setAutoSyncInterval(config.autoSyncIntervalSec);
    if (config.sharedPathCheckResult) setCheckResult(config.sharedPathCheckResult);
  }, [config]);

  const handleRunDiagnostics = async (pathToCheck?: string) => {
    const target = pathToCheck || sharedPath.trim();
    setIsCheckingPath(true);
    setStatusMsg(null);
    try {
      const res = await db.checkSharedFolderPath(target);
      setCheckResult(res);
      if (res.status === 'CONNECTED') {
        setStatusMsg({
          type: 'success',
          text: `Diagnostic Check Passed! Network path "${target}" is fully accessible with Read/Write permissions.`
        });
      } else if (res.status === 'READ_ONLY') {
        setStatusMsg({
          type: 'info',
          text: `Path is accessible for Reading, but Write access is denied. Check network share write permissions.`
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: res.errorMessage || 'Path diagnostic failed. Network directory unreachable.'
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Diagnostic check failed: ${err?.message || 'Network unreachable'}`
      });
    } finally {
      setIsCheckingPath(false);
    }
  };

  const handleModeChange = async (newMode: StorageMode) => {
    setStorageMode(newMode);
    try {
      await onConfigChange({
        storageMode: newMode,
        sharedFolderPath: sharedPath.trim(),
        sharedFolderSyncEnabled: syncEnabled
      });
      if (newMode === 'SHARED_NETWORK') {
        await handleRunDiagnostics(sharedPath.trim());
      }
      setStatusMsg({
        type: 'success',
        text: newMode === 'SHARED_NETWORK'
          ? 'Switched to Shared Network Folder Mode. Connecting to multi-PC network database.'
          : 'Switched to Standalone Local Mode. Database will be saved in \\ReferenceTracker_Data\\ beside MIRMS.exe.'
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Failed to update mode: ${err?.message}` });
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatusMsg(null);
    try {
      const cleanPath = sharedPath.trim();
      await onConfigChange({
        storageMode,
        sharedFolderPath: cleanPath,
        sharedFolderSyncEnabled: syncEnabled,
        autoSyncIntervalSec: Number(autoSyncInterval)
      });
      realtimeSync.broadcastMutation('MUTATION_CONFIG_UPDATED', 'SETTINGS', 'Shared network settings updated');
      await handleRunDiagnostics(cleanPath);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Save failed: ${err?.message}` });
    }
  };

  const handleForcePull = async () => {
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
      setStatusMsg({ type: 'error', text: `Pull failed: ${err?.message}` });
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleForcePush = async () => {
    setIsPushingNow(true);
    setStatusMsg(null);
    try {
      const res = await db.syncToSharedFolderNetwork();
      if (res.success) {
        await handleRunDiagnostics(sharedPath.trim());
        setStatusMsg({
          type: 'success',
          text: res.message || 'Successfully published local database state to shared network path.'
        });
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Push failed.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Push failed: ${err?.message}` });
    } finally {
      setIsPushingNow(false);
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

  return (
    <div className="bg-[#141414] rounded-2xl border border-[#222] p-6 shadow-xl space-y-6 select-none">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-900/40 to-emerald-900/30 border border-blue-500/30 text-blue-400 rounded-xl shrink-0">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Database Storage & Multi-PC Shared Network Settings</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Configure database location: run standalone beside MIRMS.exe or share a network folder across 2+ PCs.
            </p>
          </div>
        </div>

        {/* Live Network Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {storageMode === 'SHARED_NETWORK' ? (
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
              checkResult?.status === 'CONNECTED'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : checkResult?.status === 'READ_ONLY'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                checkResult?.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : checkResult?.status === 'READ_ONLY' ? 'bg-amber-400' : 'bg-red-500'
              }`} />
              <span>
                {checkResult?.status === 'CONNECTED'
                  ? 'SHARED NETWORK ACTIVE'
                  : checkResult?.status === 'READ_ONLY'
                  ? 'NETWORK READ-ONLY'
                  : 'NETWORK DISCONNECTED'}
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
        {/* Option 1: Standalone Local Mode */}
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
              <div className={`p-2.5 rounded-lg border ${storageMode === 'LOCAL' ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-[#222] border-[#333] text-gray-400'}`}>
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Standalone Local Mode</span>
                  {storageMode === 'LOCAL' && <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold">Active</span>}
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Saved in folder <code className="text-blue-400 font-mono">.\ReferenceTracker_Data\</code> beside <code className="text-gray-300 font-mono">MIRMS.exe</code>
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
            Recommended for single-PC use or isolated workstations. Keeps all data files located directly beside the portable executable file.
          </p>
        </div>

        {/* Option 2: Shared Network Folder Mode */}
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
              <div className={`p-2.5 rounded-lg border ${storageMode === 'SHARED_NETWORK' ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400' : 'bg-[#222] border-[#333] text-gray-400'}`}>
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Shared Network Folder Mode</span>
                  {storageMode === 'SHARED_NETWORK' && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">Active</span>}
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Multi-PC synchronized database on shared network drive path
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
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed border-t border-[#222] pt-2">
            Connects 2 or more PCs over LAN/SMB. Both PCs write, update, and receive live background database synchronization in real-time.
          </p>
        </div>
      </div>

      {/* Shared Network Configuration Form & Diagnostic Tools */}
      {storageMode === 'SHARED_NETWORK' ? (
        <form onSubmit={handleSaveSettings} className="space-y-5 bg-[#0D0D0D] p-5 rounded-xl border border-[#222]">
          <div className="space-y-4">
            {/* Shared Path Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-emerald-400" />
                  <span>Shared Folder Network Path</span>
                </span>
                <span className="text-[10px] font-mono text-gray-400">UNC Network Path or Mapped Drive</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={sharedPath}
                    onChange={(e) => setSharedPath(e.target.value)}
                    placeholder="e.g. \\192.168.1.100\QA_ReferenceTracker_Shared\ or Z:\MIRMS_Data\"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#1A1A1A] border border-[#333] text-white rounded-xl focus:outline-hidden focus:border-emerald-500 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRunDiagnostics()}
                  disabled={isCheckingPath}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <ShieldCheck className={`w-4 h-4 ${isCheckingPath ? 'animate-spin' : ''}`} />
                  <span>{isCheckingPath ? 'Checking Path...' : 'Run Path Diagnostics & Checks'}</span>
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 pt-1">
                <span className="text-gray-500">Path Formats:</span>
                <button
                  type="button"
                  onClick={() => setSharedPath('\\\\192.168.1.100\\QA_ReferenceTracker_Shared\\')}
                  className="px-2 py-0.5 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333] rounded font-mono text-[10px] text-emerald-400"
                >
                  UNC: \\192.168.1.100\QA_Share\
                </button>
                <button
                  type="button"
                  onClick={() => setSharedPath('Z:\\MIRMS_Shared_Data\\')}
                  className="px-2 py-0.5 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333] rounded font-mono text-[10px] text-emerald-400"
                >
                  Drive: Z:\MIRMS_Shared_Data\
                </button>
                <button
                  type="button"
                  onClick={() => setSharedPath('./shared_network_data/')}
                  className="px-2 py-0.5 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333] rounded font-mono text-[10px] text-emerald-400"
                >
                  Relative: ./shared_network_data/
                </button>
              </div>
            </div>

            {/* Diagnostic Results Card */}
            {checkResult && (
              <div className={`p-4 rounded-xl border space-y-3 ${
                checkResult.status === 'CONNECTED'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-gray-200'
                  : checkResult.status === 'READ_ONLY'
                  ? 'bg-amber-950/20 border-amber-500/30 text-gray-200'
                  : 'bg-red-950/20 border-red-500/30 text-gray-200'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2A]">
                  <h4 className="text-xs font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Path Diagnostic Check Results</span>
                  </h4>
                  <span className="text-[10px] font-mono text-gray-400">
                    Checked: {new Date(checkResult.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                  {/* Syntax Check */}
                  <div className="flex items-center gap-2 p-2 rounded bg-[#161616] border border-[#262626]">
                    {checkResult.syntaxValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-[10px] text-gray-400 font-sans">Syntax Check</div>
                      <div className="font-bold text-[11px]">{checkResult.syntaxValid ? 'Valid Format' : 'Invalid Syntax'}</div>
                    </div>
                  </div>

                  {/* Reachability */}
                  <div className="flex items-center gap-2 p-2 rounded bg-[#161616] border border-[#262626]">
                    {checkResult.folderAccessible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-[10px] text-gray-400 font-sans">Folder Access</div>
                      <div className="font-bold text-[11px]">{checkResult.folderAccessible ? 'Reachable' : 'Unreachable'}</div>
                    </div>
                  </div>

                  {/* Read/Write Permissions */}
                  <div className="flex items-center gap-2 p-2 rounded bg-[#161616] border border-[#262626]">
                    {checkResult.canWrite ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : checkResult.canRead ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-[10px] text-gray-400 font-sans">Permissions</div>
                      <div className="font-bold text-[11px]">
                        {checkResult.canWrite ? 'Read/Write OK' : checkResult.canRead ? 'Read-Only' : 'Denied'}
                      </div>
                    </div>
                  </div>

                  {/* Shared Database Status */}
                  <div className="flex items-center gap-2 p-2 rounded bg-[#161616] border border-[#262626]">
                    {checkResult.sharedDbFound ? (
                      <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-[10px] text-gray-400 font-sans">Shared Catalog</div>
                      <div className="font-bold text-[11px]">
                        {checkResult.sharedDbFound ? `${checkResult.sharedDbRecordCount || 0} Records` : 'New Shared DB'}
                      </div>
                    </div>
                  </div>
                </div>

                {checkResult.errorMessage && (
                  <p className="text-[11px] text-red-400 font-sans bg-red-950/40 p-2 rounded border border-red-500/30">
                    ⚠️ {checkResult.errorMessage}
                  </p>
                )}

                {checkResult.sharedDbFound && checkResult.lastUpdatedByPC && (
                  <p className="text-[11px] text-gray-400 font-sans flex items-center justify-between">
                    <span>Last written to share by PC: <strong className="text-emerald-400 font-mono">{checkResult.lastUpdatedByPC}</strong></span>
                    <span>{checkResult.sharedDbLastUpdated ? new Date(checkResult.sharedDbLastUpdated).toLocaleString() : ''}</span>
                  </p>
                )}
              </div>
            )}

            {/* Sync Frequency & Heartbeat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Auto-Sync Heartbeat Frequency</label>
                <select
                  value={autoSyncInterval}
                  onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-[#1C1C1C] border border-[#333] text-white rounded-xl focus:outline-hidden focus:border-emerald-500 transition-all font-medium"
                >
                  <option value={1}>Every 1 Second (Ultra-Fast Live)</option>
                  <option value={3}>Every 3 Seconds (Recommended)</option>
                  <option value={5}>Every 5 Seconds (Standard)</option>
                  <option value={10}>Every 10 Seconds (Low Bandwidth)</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer bg-[#1A1A1A] px-3.5 py-2.5 rounded-xl border border-[#333] text-xs font-medium text-gray-200">
                  <input
                    type="checkbox"
                    checked={syncEnabled}
                    onChange={(e) => setSyncEnabled(e.target.checked)}
                    className="rounded bg-[#222] border-[#444] text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Enable Shared Real-Time Auto-Sync</span>
                </label>
              </div>
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#222]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleForcePull}
                disabled={isSyncingNow}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                <span>Force Pull From Share</span>
              </button>

              <button
                type="button"
                onClick={handleForcePush}
                disabled={isPushingNow}
                className="px-3.5 py-2 bg-[#222] hover:bg-[#2A2A2A] text-gray-200 text-xs font-semibold rounded-xl border border-[#333] transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Push Local DB To Share</span>
              </button>
            </div>

            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save Shared Network Settings</span>
            </button>
          </div>
        </form>
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
              className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#333] text-gray-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
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
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
          statusMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : statusMsg.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}>
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
    </div>
  );
};
