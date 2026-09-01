import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Server,
  Laptop,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  Download,
  FolderOpen,
  Network,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Terminal,
  Zap,
  KeyRound,
  HardDrive
} from 'lucide-react';

interface SharedFolderHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
  onApplyPresetPath?: (path: string) => void;
}

export const SharedFolderHelpModal: React.FC<SharedFolderHelpModalProps> = ({
  isOpen,
  onClose,
  currentPath = '',
  onApplyPresetPath
}) => {
  const [activeTab, setActiveTab] = useState<'QUICK_START' | 'HOST_SETUP' | 'CLIENT_SETUP' | 'PERMISSIONS' | 'TROUBLESHOOTING' | 'BATCH_SCRIPTS'>('QUICK_START');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const downloadBatScript = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hostBatContent = `@echo off
title Setup QA Reference Tracker Shared Folder
echo ===================================================
echo   CONFIGURING HOST PC SHARED FOLDER (MIRMS)
echo ===================================================
echo.

:: 1. Create Folder
set SHARE_DIR=C:\\QA_ReferenceTracker_Shared
if not exist "%SHARE_DIR%" (
    mkdir "%SHARE_DIR%"
    echo [OK] Created directory: %SHARE_DIR%
) else (
    echo [INFO] Directory already exists: %SHARE_DIR%
)

:: 2. Set Private Network Profile
powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"
echo [OK] Set Network Profile to Private.

:: 3. Configure Windows SMB Share
net share QA_ReferenceTracker_Shared /delete >nul 2>&1
net share QA_ReferenceTracker_Shared="%SHARE_DIR%" /grant:Everyone,FULL /unlimited
echo [OK] Created Windows SMB Share with Full Control for Everyone.

:: 4. Configure NTFS File Security Permissions
icacls "%SHARE_DIR%" /grant Everyone:(OI)(CI)F /T /Q
echo [OK] Granted NTFS Full Control permissions to Everyone.

:: 5. Display IP Address
echo.
echo ===================================================
echo   HOST PC CONFIGURATION COMPLETE!
echo ===================================================
echo Your Workstation IP Address is:
ipconfig | findstr /i "IPv4"
echo.
echo Network Path for Client PCs:
echo   \\\\%COMPUTERNAME%\\QA_ReferenceTracker_Shared\\
echo.
pause`;

  const clientBatContent = `@echo off
title Connect to QA Reference Tracker Shared Folder
echo ===================================================
echo   CONNECTING TO HOST SHARED FOLDER (MIRMS)
echo ===================================================
echo.
set /p HOST_IP="Enter Host PC IP Address or Name (e.g. 192.168.1.100): "

echo Testing connection to \\\\%HOST_IP%\\QA_ReferenceTracker_Shared...
net use Z: /delete /y >nul 2>&1
net use Z: "\\\\%HOST_IP%\\QA_ReferenceTracker_Shared" /persistent:yes

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Connected! Mapped \\\\%HOST_IP%\\QA_ReferenceTracker_Shared to Drive Z:
    echo Opening Z: in Windows Explorer...
    explorer Z:
) else (
    echo.
    echo [ERROR] Could not connect to \\\\%HOST_IP%\\QA_ReferenceTracker_Shared.
    echo Please check firewall settings and permissions on the Host PC.
)
echo.
pause`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#181818] border-b border-[#2A2A2A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-900/50 to-blue-900/40 border border-emerald-500/40 text-emerald-400 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Multi-PC Shared Folder Connection & Linking Guide</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
                  Windows LAN / SMB
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Step-by-step instructions to link 2+ computers across your local network without dedicated server hardware
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#252525] rounded-xl transition-all"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-[#141414] border-b border-[#222] overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('QUICK_START')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'QUICK_START'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1E1E1E]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-300" />
            <span>1. Quick Start (4 Steps)</span>
          </button>

          <button
            onClick={() => setActiveTab('HOST_SETUP')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'HOST_SETUP'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1E1E1E]'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-blue-300" />
            <span>2. Host PC (Server) Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('CLIENT_SETUP')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'CLIENT_SETUP'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1E1E1E]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-purple-300" />
            <span>3. Client PC & Drive Z:</span>
          </button>

          <button
            onClick={() => setActiveTab('PERMISSIONS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'PERMISSIONS'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1E1E1E]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>4. Permissions (Share vs NTFS)</span>
          </button>

          <button
            onClick={() => setActiveTab('TROUBLESHOOTING')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'TROUBLESHOOTING'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1E1E1E]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-300" />
            <span>5. Troubleshooting & Errors</span>
          </button>

          <button
            onClick={() => setActiveTab('BATCH_SCRIPTS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'BATCH_SCRIPTS'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1E1E1E]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-300" />
            <span>6. 1-Click .BAT Scripts</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-300 leading-relaxed">
          {/* TAB 1: QUICK START */}
          {activeTab === 'QUICK_START' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#161616] to-blue-950/30 border border-emerald-500/30 flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5">
                  <Network className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">How Multi-PC Shared Linking Works</h3>
                  <p className="text-gray-300 leading-relaxed">
                    The Material Reference & Sample Tracking System uses a decentralized peer-to-peer file synchronization engine. All connected workstations read from and write to a single shared network database file (<code className="font-mono text-emerald-300">shared_material_reference.json</code>) located on your local network. No cloud internet or expensive database servers are required.
                  </p>
                </div>
              </div>

              {/* 4-Step Visual Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-[#181818] border border-[#2A2A2A] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[11px]">
                      STEP 1
                    </span>
                    <Server className="w-4 h-4 text-gray-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Create & Share Folder on Host PC</h4>
                  <p className="text-gray-400">
                    On your main computer, create <code className="font-mono text-emerald-300">C:\QA_ReferenceTracker_Shared</code>. Right-click &gt; Properties &gt; Sharing &gt; Advanced Sharing &gt; Share this folder with <strong>Full Control</strong> permissions for Everyone.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-[#181818] border border-[#2A2A2A] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 font-mono font-bold text-[11px]">
                      STEP 2
                    </span>
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Set NTFS Security Permissions</h4>
                  <p className="text-gray-400">
                    In folder Properties &gt; <strong>Security</strong> tab &gt; click Edit &gt; Add <strong>Everyone</strong> &gt; Check <strong>Modify</strong> and <strong>Write</strong> permissions. (Without this, Windows blocks writes even if shared).
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-[#181818] border border-[#2A2A2A] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-400 font-mono font-bold text-[11px]">
                      STEP 3
                    </span>
                    <Laptop className="w-4 h-4 text-gray-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Connect from Client Workstation</h4>
                  <p className="text-gray-400">
                    On your second PC, press <code className="font-mono bg-[#222] px-1 py-0.5 rounded">Win + R</code> and type <code className="font-mono text-purple-300">\\192.168.1.100\QA_ReferenceTracker_Shared</code> to confirm the folder opens. Or map it as drive <strong>Z:\</strong>.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-xl bg-[#181818] border border-[#2A2A2A] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 font-mono font-bold text-[11px]">
                      STEP 4
                    </span>
                    <Zap className="w-4 h-4 text-gray-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Link in Application & Push/Pull</h4>
                  <p className="text-gray-400">
                    In MIRMS on both PCs: Select <strong>Shared Network Folder Mode</strong>, enter the path, click <strong>Run Path Diagnostics</strong>, then click <strong>Push Local DB to Share</strong> on Host and <strong>Force Pull</strong> on Client.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-white">Want automated configuration?</div>
                  <div className="text-[11px] text-gray-400">Download or copy our 1-click Windows batch scripts to configure in 5 seconds.</div>
                </div>
                <button
                  onClick={() => setActiveTab('BATCH_SCRIPTS')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center gap-2 shrink-0"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Go to 1-Click .BAT Scripts</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: HOST PC SETUP */}
          {activeTab === 'HOST_SETUP' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#2A2A2A]">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span>Step-by-Step Host PC (Storage Server) Configuration</span>
                </div>

                {/* Sub-step 1 */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] flex items-center justify-center font-mono">1</span>
                    <span>Set Windows Network Profile to Private</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    By default, Windows sets new networks to "Public", which turns on aggressive firewall rules blocking incoming connections to port 445 (SMB).
                  </p>
                  <div className="p-3 bg-[#0E0E0E] rounded-lg border border-[#222] font-mono text-[11px] text-blue-300 flex items-center justify-between gap-2">
                    <code>powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"</code>
                    <button
                      onClick={() => copyToClipboard('powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"', 'ps_private')}
                      className="p-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-gray-300 rounded transition-all shrink-0"
                      title="Copy command"
                    >
                      {copiedKey === 'ps_private' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Sub-step 2 */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] flex items-center justify-center font-mono">2</span>
                    <span>Create and Share the Folder</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-gray-400 text-xs">
                    <li>Create folder <code className="font-mono text-emerald-300">C:\QA_ReferenceTracker_Shared</code>.</li>
                    <li>Right-click the folder &gt; <strong>Properties</strong> &gt; <strong>Sharing</strong> tab.</li>
                    <li>Click <strong>Advanced Sharing...</strong> &gt; Check <strong>Share this folder</strong>.</li>
                    <li>Click <strong>Permissions</strong> &gt; Select <strong>Everyone</strong> &gt; Check <strong>Full Control</strong> and <strong>Change</strong> &gt; Click Apply &gt; OK.</li>
                  </ol>
                </div>

                {/* Sub-step 3 */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] flex items-center justify-center font-mono">3</span>
                    <span>Find Host PC IP Address & Computer Name</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Open Command Prompt (<code className="font-mono bg-[#222] px-1 rounded">cmd</code>) and run <code className="font-mono text-emerald-300">ipconfig</code> to find your IPv4 Address (e.g. 192.168.1.100).
                  </p>
                  <div className="p-3 bg-[#0E0E0E] rounded-lg border border-[#222] font-mono text-[11px] text-emerald-300 flex items-center justify-between gap-2">
                    <code>ipconfig | findstr /i "IPv4"</code>
                    <button
                      onClick={() => copyToClipboard('ipconfig | findstr /i "IPv4"', 'cmd_ip')}
                      className="p-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-gray-300 rounded transition-all shrink-0"
                      title="Copy command"
                    >
                      {copiedKey === 'cmd_ip' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLIENT PC SETUP */}
          {activeTab === 'CLIENT_SETUP' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#2A2A2A]">
                  <Laptop className="w-4 h-4 text-purple-400" />
                  <span>Connecting from Client Workstation (PC 2, PC 3, Laptops)</span>
                </div>

                {/* Direct UNC Connection */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-3">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[11px] flex items-center justify-center font-mono">A</span>
                    <span>Method 1: Direct UNC Network Path (Standard)</span>
                  </h4>
                  <p className="text-gray-400 text-xs">
                    Press <code className="font-mono bg-[#222] px-1 py-0.5 rounded text-white">Win + R</code> and type the UNC address to verify folder access:
                  </p>
                  <div className="p-3 bg-[#0E0E0E] rounded-lg border border-[#222] font-mono text-[11px] text-purple-300 flex items-center justify-between gap-2">
                    <code>\\192.168.1.100\QA_ReferenceTracker_Shared\</code>
                    <button
                      onClick={() => copyToClipboard('\\\\192.168.1.100\\QA_ReferenceTracker_Shared\\', 'unc_path')}
                      className="p-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-gray-300 rounded transition-all shrink-0"
                      title="Copy path"
                    >
                      {copiedKey === 'unc_path' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {onApplyPresetPath && (
                    <button
                      onClick={() => {
                        onApplyPresetPath('\\\\192.168.1.100\\QA_ReferenceTracker_Shared\\');
                        onClose();
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-bold"
                    >
                      Apply this UNC path into App Settings
                    </button>
                  )}
                </div>

                {/* Permanent Mapped Drive */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-3">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[11px] flex items-center justify-center font-mono">B</span>
                    <span>Method 2: Map Permanent Network Drive (Z:) — Recommended!</span>
                  </h4>
                  <p className="text-gray-400 text-xs">
                    Mapping a drive letter guarantees that Windows reconnects on startup and avoids UNC permission quirks.
                  </p>
                  <div className="p-3 bg-[#0E0E0E] rounded-lg border border-[#222] font-mono text-[11px] text-purple-300 flex items-center justify-between gap-2">
                    <code>net use Z: "\\192.168.1.100\QA_ReferenceTracker_Shared" /persistent:yes</code>
                    <button
                      onClick={() => copyToClipboard('net use Z: "\\\\192.168.1.100\\QA_ReferenceTracker_Shared" /persistent:yes', 'cmd_netuse')}
                      className="p-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-gray-300 rounded transition-all shrink-0"
                      title="Copy command"
                    >
                      {copiedKey === 'cmd_netuse' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {onApplyPresetPath && (
                    <button
                      onClick={() => {
                        onApplyPresetPath('Z:\\');
                        onClose();
                      }}
                      className="text-[11px] text-purple-400 hover:text-purple-300 underline font-bold"
                    >
                      Apply "Z:\" Mapped Drive path into App Settings
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PERMISSIONS */}
          {activeTab === 'PERMISSIONS' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#2A2A2A]">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>The Critical Difference: Share Permissions vs. NTFS Security Permissions</span>
                </div>

                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-gray-300 space-y-2">
                  <div className="font-bold text-amber-400 flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Why "Network Read-Only" or "Access Denied" Happens</span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-300">
                    Windows uses <strong>two separate layers of security</strong> for shared folders. Both layers MUST grant Write access, otherwise Windows will reject database save operations:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Layer 1: Share Permissions</span>
                    </h4>
                    <p className="text-gray-400 text-xs">
                      Controls who can connect over the LAN network.
                    </p>
                    <ul className="text-xs text-gray-300 space-y-1 pt-1 list-disc list-inside">
                      <li>Location: Properties &gt; Sharing &gt; Advanced Sharing &gt; Permissions.</li>
                      <li>Required: <strong>Full Control</strong> and <strong>Change</strong>.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Layer 2: NTFS Security Permissions</span>
                    </h4>
                    <p className="text-gray-400 text-xs">
                      Controls actual disk file read/write rights on the hard drive.
                    </p>
                    <ul className="text-xs text-gray-300 space-y-1 pt-1 list-disc list-inside">
                      <li>Location: Properties &gt; Security &gt; Edit.</li>
                      <li>Required: <strong>Modify</strong> and <strong>Write</strong> for Everyone.</li>
                    </ul>
                  </div>
                </div>

                {/* Instant Fix Command */}
                <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] space-y-2">
                  <div className="font-bold text-white text-xs">Instant 1-Line Command to Fix NTFS Security (Run as Admin on Host):</div>
                  <div className="p-3 bg-[#0E0E0E] rounded-lg border border-[#222] font-mono text-[11px] text-amber-300 flex items-center justify-between gap-2">
                    <code>icacls "C:\QA_ReferenceTracker_Shared" /grant Everyone:(OI)(CI)F /T /Q</code>
                    <button
                      onClick={() => copyToClipboard('icacls "C:\\QA_ReferenceTracker_Shared" /grant Everyone:(OI)(CI)F /T /Q', 'cmd_icacls')}
                      className="p-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-gray-300 rounded transition-all shrink-0"
                      title="Copy command"
                    >
                      {copiedKey === 'cmd_icacls' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TROUBLESHOOTING & ERRORS */}
          {activeTab === 'TROUBLESHOOTING' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#2A2A2A]">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Common Windows Network Errors & Instant Fixes</span>
                </div>

                {/* Error 1 */}
                <div className="p-4 rounded-xl bg-[#161616] border border-red-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-red-400">
                    <span>Error 0x80070035 ("The network path was not found")</span>
                    <span className="font-mono text-[10px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">Network Unreachable</span>
                  </div>
                  <p className="text-gray-300 text-xs">
                    <strong>Cause:</strong> Windows Firewall is blocking SMB Port 445 on the Host PC, or Host PC network profile is set to "Public".
                  </p>
                  <p className="text-emerald-400 text-xs">
                    <strong>Fix:</strong> Run this in PowerShell (Run as Administrator) on Host PC:
                  </p>
                  <div className="p-2.5 bg-[#0E0E0E] rounded font-mono text-[11px] text-blue-300 flex items-center justify-between">
                    <code>New-NetFirewallRule -DisplayName "SMB-In" -Direction Inbound -Protocol TCP -LocalPort 445 -Action Allow</code>
                    <button
                      onClick={() => copyToClipboard('New-NetFirewallRule -DisplayName "SMB-In" -Direction Inbound -Protocol TCP -LocalPort 445 -Action Allow', 'cmd_firewall')}
                      className="p-1 bg-[#222] hover:bg-[#333] text-gray-300 rounded"
                    >
                      {copiedKey === 'cmd_firewall' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Error 2 */}
                <div className="p-4 rounded-xl bg-[#161616] border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <span>Error 0x80070005 ("Access is Denied")</span>
                    <span className="font-mono text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">Permission Denied</span>
                  </div>
                  <p className="text-gray-300 text-xs">
                    <strong>Cause:</strong> The folder is shared, but the underlying NTFS disk security permissions do not include write privileges for Everyone.
                  </p>
                  <p className="text-emerald-400 text-xs">
                    <strong>Fix:</strong> Right-click folder &gt; Properties &gt; Security &gt; Edit &gt; Add "Everyone" &gt; Allow Modify and Write.
                  </p>
                </div>

                {/* Error 3 */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Password Prompt Keeps Appearing</span>
                    <span className="font-mono text-[10px] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 text-blue-400">Credentials</span>
                  </div>
                  <p className="text-gray-300 text-xs">
                    <strong>Fix:</strong> On Client PC: Open Control Panel &gt; <strong>Credential Manager</strong> &gt; <strong>Windows Credentials</strong> &gt; Add a Windows credential for your Host IP address and enter the Host PC login credentials with "Remember credentials".
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BATCH SCRIPTS */}
          {activeTab === 'BATCH_SCRIPTS' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white pb-2 border-b border-[#2A2A2A]">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>1-Click Windows Automation Batch Scripts</span>
                </div>
                <p className="text-xs text-gray-400">
                  Download or copy these pre-configured batch scripts to automatically set up the shared folder, configure permissions, and map network drives with zero manual clicking.
                </p>

                {/* Host Script */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="font-bold text-white text-xs flex items-center gap-2">
                      <Server className="w-4 h-4 text-blue-400" />
                      <span>Script A: Run on HOST PC (`SETUP_HOST_SHARE.bat`)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(hostBatContent, 'bat_host')}
                        className="px-3 py-1 bg-[#222] hover:bg-[#2E2E2E] text-gray-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                      >
                        {copiedKey === 'bat_host' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Script</span>
                      </button>
                      <button
                        onClick={() => downloadBatScript('SETUP_HOST_SHARE.bat', hostBatContent)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .BAT</span>
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222] font-mono text-[10px] text-gray-300 overflow-x-auto max-h-48">
                    {hostBatContent}
                  </pre>
                </div>

                {/* Client Script */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="font-bold text-white text-xs flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-purple-400" />
                      <span>Script B: Run on CLIENT PC (`CONNECT_CLIENT_SHARE.bat`)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(clientBatContent, 'bat_client')}
                        className="px-3 py-1 bg-[#222] hover:bg-[#2E2E2E] text-gray-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                      >
                        {copiedKey === 'bat_client' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Script</span>
                      </button>
                      <button
                        onClick={() => downloadBatScript('CONNECT_CLIENT_SHARE.bat', clientBatContent)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .BAT</span>
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222] font-mono text-[10px] text-gray-300 overflow-x-auto max-h-48">
                    {clientBatContent}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#181818] border-t border-[#2A2A2A] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            <span>Also saved locally in project as: <code className="font-mono text-emerald-300">README_SHARED_FOLDER.md</code></span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all w-full sm:w-auto"
          >
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
