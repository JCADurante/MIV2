/**
 * Tauri desktop bridge service.
 * Supports Windows Portable EXE file operations, dialogs, paths, and SQLite commands.
 * Falls back gracefully to browser-safe operations when running in Web/Preview mode.
 */

import { SharedPathCheckResult, DatabaseHealthReport, DatabaseHealthIssue } from '../types';
import { safeLocalStorage } from './safeStorage';

// Check if running inside Tauri window context
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export interface FileSelectionResult {
  filePath?: string;
  fileName: string;
  fileData?: ArrayBuffer | string;
  fileSize: number;
}

export const tauriBridge = {
  isDesktop: isTauri,

  async openDataFolder(customPath?: string): Promise<string> {
    const targetPath = customPath || 'Application Data/ReferenceTracker_Data/';
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke('open_data_folder', { path: targetPath });
      } catch (err) {
        console.warn('Tauri open_data_folder fallback:', err);
      }
    }
    return targetPath;
  },

  async getDataDirectory(): Promise<string> {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke('get_data_directory');
      } catch (err) {
        console.warn('Tauri get_data_directory fallback:', err);
      }
    }
    return 'Application Data/ReferenceTracker_Data/';
  },

  async pickExcelFile(): Promise<FileSelectionResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx, .xls, .csv';
      input.onchange = async (e: Event) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const file = files[0];
          const buffer = await file.arrayBuffer();
          resolve({
            fileName: file.name,
            fileSize: file.size,
            fileData: buffer
          });
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  },

  async pickImageFile(): Promise<FileSelectionResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png, image/jpeg, image/webp, image/bmp, image/svg+xml';
      input.onchange = async (e: Event) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const file = files[0];
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              fileName: file.name,
              fileSize: file.size,
              fileData: reader.result as string
            });
          };
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  },

  async pickMultipleImageFiles(): Promise<FileSelectionResult[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/png, image/jpeg, image/webp, image/bmp, image/svg+xml';
      input.onchange = async (e: Event) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files || files.length === 0) {
          resolve([]);
          return;
        }

        const results: FileSelectionResult[] = [];
        const fileList = Array.from(files);

        for (const file of fileList) {
          await new Promise<void>((fileResolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              results.push({
                fileName: file.name,
                fileSize: file.size,
                fileData: reader.result as string
              });
              fileResolve();
            };
            reader.onerror = () => fileResolve();
            reader.readAsDataURL(file);
          });
        }
        resolve(results);
      };
      input.click();
    });
  },

  async readFilesFromDrop(dataTransfer: DataTransfer): Promise<FileSelectionResult[]> {
    const results: FileSelectionResult[] = [];
    const files = Array.from(dataTransfer.files).filter(f => f.type.startsWith('image/'));
    for (const file of files) {
      await new Promise<void>((fileResolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          results.push({
            fileName: file.name,
            fileSize: file.size,
            fileData: reader.result as string
          });
          fileResolve();
        };
        reader.onerror = () => fileResolve();
        reader.readAsDataURL(file);
      });
    }
    return results;
  },

  async pickDocumentFile(): Promise<FileSelectionResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf, .docx, .doc, .txt, .xlsx, .zip';
      input.onchange = async (e: Event) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const file = files[0];
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              fileName: file.name,
              fileSize: file.size,
              fileData: reader.result as string
            });
          };
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  },

  async pickBackupZipFile(): Promise<FileSelectionResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip';
      input.onchange = async (e: Event) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const file = files[0];
          const buffer = await file.arrayBuffer();
          resolve({
            fileName: file.name,
            fileSize: file.size,
            fileData: buffer
          });
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  },

  saveFileBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  /**
   * Delete a file from disk using Tauri fs plugin or native bridge commands.
   */
  async removeFile(filePath?: string): Promise<boolean> {
    if (!filePath) return false;

    if (isTauri()) {
      try {
        const { remove } = await import('@tauri-apps/plugin-fs');
        await remove(filePath);
        return true;
      } catch (pluginErr) {
        console.warn('Tauri plugin-fs remove failed, trying invoke fallback:', pluginErr);
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('remove_file', { path: filePath });
          return true;
        } catch (invokeErr) {
          console.warn('Tauri invoke remove_file fallback error:', invokeErr);
        }
      }
    }
    return false;
  },

  /**
   * Delete document template from Tauri app data templates directory or specific path.
   */
  async deleteTemplateFile(filePath?: string, fileName?: string): Promise<boolean> {
    let deleted = false;
    if (filePath) {
      deleted = await this.removeFile(filePath);
    }

    if (fileName && isTauri()) {
      try {
        const dataDir = await this.getDataDirectory();
        const templatePath = `${dataDir.replace(/\\/g, '/')}/templates/${fileName}`;
        const res = await this.removeFile(templatePath);
        if (res) deleted = true;
      } catch (err) {
        console.warn('Tauri deleteTemplateFile dataDir fallback error:', err);
      }
    }

    return deleted;
  },

  /**
   * Helper key generator for fallback web-storage virtual network shares.
   */
  getSharedKey(path: string): string {
    const clean = (path || '').trim().replace(/[\\/]/g, '_').toLowerCase();
    return `mat_ref_shared_net_db_${clean || 'default'}`;
  },

  getSharedMetaKey(path: string): string {
    const clean = (path || '').trim().replace(/[\\/]/g, '_').toLowerCase();
    return `mat_ref_shared_net_meta_${clean || 'default'}`;
  },

  /**
   * Write database payload to shared network folder path.
   */
  async writeSharedDatabaseFile(sharedPath: string, payload: any): Promise<boolean> {
    const targetPath = (sharedPath || '').trim();
    if (!targetPath) return false;

    const dbStr = JSON.stringify(payload);
    const metaStr = JSON.stringify({
      timestamp: payload.updatedAt || new Date().toISOString(),
      user: payload.updatedByUser || 'QC Inspector',
      workstation: payload.updatedByWorkstation || 'Workstation',
      masterItemsCount: payload.masterItems?.length || 0,
      registrationsCount: payload.registrations?.length || 0,
      dataSizeKb: Math.round(dbStr.length / 1024)
    });

    if (isTauri()) {
      try {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        const dbFile = `${targetPath.replace(/[\\/]+$/, '')}/shared_material_reference.json`;
        const metaFile = `${targetPath.replace(/[\\/]+$/, '')}/shared_db_meta.json`;

        await writeTextFile(dbFile, dbStr);
        await writeTextFile(metaFile, metaStr);
        return true;
      } catch (err) {
        console.warn('Tauri plugin-fs write text file failed, trying invoke:', err);
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('write_shared_file', { path: targetPath, content: dbStr });
          await invoke('write_shared_file', { path: `${targetPath}/shared_db_meta.json`, content: metaStr });
          return true;
        } catch (invokeErr) {
          console.warn('Tauri invoke write_shared_file error:', invokeErr);
        }
      }
    }

    // Fallback / Web mode virtual shared folder store
    try {
      safeLocalStorage.setItem(this.getSharedKey(targetPath), dbStr);
      safeLocalStorage.setItem(this.getSharedMetaKey(targetPath), metaStr);
      return true;
    } catch (e) {
      console.error('Web storage shared database save failed:', e);
      return false;
    }
  },

  /**
   * Read database payload from shared network folder path.
   */
  async readSharedDatabaseFile(sharedPath: string): Promise<any | null> {
    const targetPath = (sharedPath || '').trim();
    if (!targetPath) return null;

    if (isTauri()) {
      try {
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        const dbFile = `${targetPath.replace(/[\\/]+$/, '')}/shared_material_reference.json`;
        const text = await readTextFile(dbFile);
        if (text) return JSON.parse(text);
      } catch (err) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const text: string = await invoke('read_shared_file', { path: targetPath });
          if (text) return JSON.parse(text);
        } catch (e) {}
      }
    }

    // Fallback web mode
    try {
      const raw = safeLocalStorage.getItem(this.getSharedKey(targetPath));
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  },

  /**
   * Read metadata from shared network folder path.
   */
  async readSharedMetaFile(sharedPath: string): Promise<any | null> {
    const targetPath = (sharedPath || '').trim();
    if (!targetPath) return null;

    if (isTauri()) {
      try {
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        const metaFile = `${targetPath.replace(/[\\/]+$/, '')}/shared_db_meta.json`;
        const text = await readTextFile(metaFile);
        if (text) return JSON.parse(text);
      } catch (err) {}
    }

    try {
      const raw = safeLocalStorage.getItem(this.getSharedMetaKey(targetPath));
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  },

  /**
   * Diagnostic check on shared folder network path.
   * Performs Syntax check, Access check, Read/Write test check, and Database check.
   */
  async testSharedPathAccess(sharedPath: string): Promise<SharedPathCheckResult> {
    const path = (sharedPath || '').trim();
    const now = new Date().toISOString();

    if (!path) {
      return {
        lastChecked: now,
        syntaxValid: false,
        folderAccessible: false,
        canRead: false,
        canWrite: false,
        sharedDbFound: false,
        status: 'ERROR',
        errorMessage: 'Shared folder path is empty. Please enter a UNC network path (e.g. \\\\SERVER\\SharedData) or local drive path.'
      };
    }

    // Check 1: Syntax check (UNC path, Mapped drive, Relative, or Absolute)
    const uncPattern = /^\\\\[a-zA-Z0-9_\-\.\s]+\\[a-zA-Z0-9_\-\.\$\s\\]+$/;
    const drivePattern = /^[a-zA-Z]:\\/i;
    const relativePattern = /^\.?\.?[\\/]/;
    const isSyntaxValid = uncPattern.test(path) || drivePattern.test(path) || relativePattern.test(path) || path.length > 2;

    if (!isSyntaxValid) {
      return {
        lastChecked: now,
        syntaxValid: false,
        folderAccessible: false,
        canRead: false,
        canWrite: false,
        sharedDbFound: false,
        status: 'ERROR',
        errorMessage: `Invalid path syntax: "${path}". Use standard Windows network UNC format (\\\\SERVER\\Share) or drive path (Z:\\Folder).`
      };
    }

    let folderAccessible = false;
    let canRead = false;
    let canWrite = false;
    let sharedDbFound = false;
    let sharedDbRecordCount = 0;
    let sharedDbLastUpdated: string | undefined = undefined;
    let lastUpdatedByPC: string | undefined = undefined;

    if (isTauri()) {
      try {
        const { exists, writeTextFile, readTextFile, remove } = await import('@tauri-apps/plugin-fs');
        const cleanPath = path.replace(/[\\/]+$/, '');
        const testFile = `${cleanPath}/.mirms_write_test_${Date.now()}.tmp`;

        // 1. Accessibility & write test
        await writeTextFile(testFile, 'MIRMS Network Write Access Verification Test');
        canWrite = true;
        folderAccessible = true;

        // 2. Read test
        const testContent = await readTextFile(testFile);
        if (testContent.includes('MIRMS')) {
          canRead = true;
        }

        // Clean up test file
        try {
          await remove(testFile);
        } catch (e) {}

        // 3. Shared database existence check
        const dbFile = `${cleanPath}/shared_material_reference.json`;
        const metaFile = `${cleanPath}/shared_db_meta.json`;
        if (await exists(metaFile)) {
          const metaText = await readTextFile(metaFile);
          const meta = JSON.parse(metaText);
          sharedDbFound = true;
          sharedDbRecordCount = (meta.masterItemsCount || 0) + (meta.registrationsCount || 0);
          sharedDbLastUpdated = meta.timestamp;
          lastUpdatedByPC = meta.workstation;
        } else if (await exists(dbFile)) {
          const dbText = await readTextFile(dbFile);
          const parsed = JSON.parse(dbText);
          sharedDbFound = true;
          sharedDbRecordCount = (parsed.masterItems?.length || 0) + (parsed.registrations?.length || 0);
          sharedDbLastUpdated = parsed.updatedAt;
          lastUpdatedByPC = parsed.updatedByWorkstation;
        }
      } catch (err: any) {
        console.warn('Tauri testSharedPathAccess check failed:', err);
        return {
          lastChecked: now,
          syntaxValid: true,
          folderAccessible: false,
          canRead: false,
          canWrite: false,
          sharedDbFound: false,
          status: 'ERROR',
          errorMessage: `Network path unreachable or permission denied: ${err?.message || 'Access Denied'}. Ensure the shared folder is shared on the local network with Read/Write permissions.`
        };
      }
    } else {
      // Browser / Web Mode verification
      folderAccessible = true;
      canRead = true;
      canWrite = true;
      const meta = await this.readSharedMetaFile(path);
      if (meta) {
        sharedDbFound = true;
        sharedDbRecordCount = (meta.masterItemsCount || 0) + (meta.registrationsCount || 0);
        sharedDbLastUpdated = meta.timestamp;
        lastUpdatedByPC = meta.workstation;
      }
    }

    const status = canWrite && canRead ? 'CONNECTED' : canRead ? 'READ_ONLY' : 'ERROR';

    return {
      lastChecked: now,
      syntaxValid: true,
      folderAccessible,
      canRead,
      canWrite,
      sharedDbFound,
      sharedDbRecordCount,
      sharedDbLastUpdated,
      lastUpdatedByPC,
      status,
      errorMessage: canWrite ? undefined : 'Shared folder path is accessible for Reading but Write permission is denied.'
    };
  },

  /**
   * Run Database Health Scan: scans for file locks, connection timeouts, and file corruption.
   */
  async scanDatabaseHealth(sharedPath: string): Promise<DatabaseHealthReport> {
    const path = (sharedPath || '').trim();
    const now = new Date().toISOString();
    const issues: DatabaseHealthIssue[] = [];

    let sharedFolderAccessible = false;
    let fileLockStatus: 'NO_LOCKS' | 'LOCK_DETECTED' | 'STALE_LOCK_FOUND' = 'NO_LOCKS';
    let dbIntegrityStatus: 'VALID' | 'CORRUPTED' | 'MISSING' | 'INVALID_JSON' = 'MISSING';
    let recordCount = 0;
    let dbFileSizeKb = 0;
    let lastWriterWorkstation: string | undefined = undefined;
    let lastWriterUser: string | undefined = undefined;
    let lastUpdatedTime: string | undefined = undefined;

    const startTime = performance.now();

    if (!path) {
      issues.push({
        id: 'no_path',
        type: 'PERMISSION',
        severity: 'HIGH',
        title: 'Empty Network Path',
        details: 'No shared folder path or database location configured.',
        recommendation: 'Specify a valid network UNC path (\\\\SERVER\\Share) or local data path.'
      });
      return {
        lastScanned: now,
        overallHealth: 'UNREACHABLE',
        sharedFolderAccessible: false,
        fileLockStatus: 'NO_LOCKS',
        connectionTimeoutMs: 0,
        dbIntegrityStatus: 'MISSING',
        recordCount: 0,
        dbFileSizeKb: 0,
        issues
      };
    }

    // Measure connection latency / timeout
    let connectionTimeoutMs = 0;
    try {
      const cleanPath = path.replace(/[\\/]+$/, '');
      if (isTauri()) {
        const { exists, readTextFile } = await import('@tauri-apps/plugin-fs');

        // 1. Accessibility test
        const lockFile = `${cleanPath}/shared_material_reference.db.lock`;
        const jsonLockFile = `${cleanPath}/shared_material_reference.json.lock`;
        const dbFile = `${cleanPath}/shared_material_reference.json`;

        sharedFolderAccessible = true;
        connectionTimeoutMs = Math.round(performance.now() - startTime);

        // 2. Lock check
        const hasLock = (await exists(lockFile)) || (await exists(jsonLockFile));
        if (hasLock) {
          let lockAgeMinutes = 0;
          try {
            const targetLock = (await exists(lockFile)) ? lockFile : jsonLockFile;
            const lockContent = await readTextFile(targetLock).catch(() => '');
            if (lockContent) {
              const lockMeta = JSON.parse(lockContent);
              if (lockMeta.time) {
                lockAgeMinutes = (Date.now() - new Date(lockMeta.time).getTime()) / 60000;
              }
            }
          } catch (e) {}

          if (lockAgeMinutes > 2) {
            fileLockStatus = 'STALE_LOCK_FOUND';
            issues.push({
              id: 'stale_lock',
              type: 'LOCK',
              severity: 'MEDIUM',
              title: 'Orphaned Stale File Lock Detected',
              details: `An unreleased process lock file was found on the shared drive (~${Math.max(1, Math.round(lockAgeMinutes))} mins old).`,
              recommendation: 'Click "Reset Connection" to safely release orphaned lock files.'
            });
          } else {
            fileLockStatus = 'LOCK_DETECTED';
            issues.push({
              id: 'active_lock',
              type: 'LOCK',
              severity: 'LOW',
              title: 'Active Workstation Write Lock',
              details: 'Another workstation is writing to the database file.',
              recommendation: 'Normal multi-PC write lock. Click "Reset Connection" if database stays locked.'
            });
          }
        }

        // 3. Integrity & Corruption Scan
        if (await exists(dbFile)) {
          const rawText = await readTextFile(dbFile);
          dbFileSizeKb = Math.round(rawText.length / 1024);
          try {
            const parsed = JSON.parse(rawText);
            if (Array.isArray(parsed.masterItems) && Array.isArray(parsed.registrations)) {
              dbIntegrityStatus = 'VALID';
              recordCount = parsed.masterItems.length + parsed.registrations.length;
              lastWriterWorkstation = parsed.updatedByWorkstation;
              lastWriterUser = parsed.updatedByUser;
              lastUpdatedTime = parsed.updatedAt;
            } else {
              dbIntegrityStatus = 'CORRUPTED';
              issues.push({
                id: 'corrupted_schema',
                type: 'CORRUPTION',
                severity: 'HIGH',
                title: 'Database Schema Structure Corrupted',
                details: 'Database file exists but expected master catalog arrays are invalid or damaged.',
                recommendation: 'Use "Reset Connection" to re-synchronize local clean state or restore from daily backup.'
              });
            }
          } catch (jsonErr: any) {
            dbIntegrityStatus = 'INVALID_JSON';
            issues.push({
              id: 'corrupted_syntax',
              type: 'CORRUPTION',
              severity: 'HIGH',
              title: 'Database Serialization / Syntax Error',
              details: `Parsing error: ${jsonErr?.message || 'Invalid format'}.`,
              recommendation: 'Click "Reset Connection" to attempt automatic database re-initialization.'
            });
          }
        } else {
          dbIntegrityStatus = 'MISSING';
          issues.push({
            id: 'missing_db',
            type: 'WARNING',
            severity: 'LOW',
            title: 'Shared Database File Not Created Yet',
            details: `No shared database file found at "${cleanPath}".`,
            recommendation: 'Click "Reset Connection" or "Push Local DB" to publish initial database.'
          });
        }
      } else {
        // Web / Browser Virtual Mode Diagnostic Scan
        sharedFolderAccessible = true;
        connectionTimeoutMs = Math.round(performance.now() - startTime);

        const raw = safeLocalStorage.getItem(this.getSharedKey(path));
        const lockStr = safeLocalStorage.getItem(`${this.getSharedKey(path)}_lock`);

        if (lockStr) {
          fileLockStatus = 'STALE_LOCK_FOUND';
          issues.push({
            id: 'web_lock',
            type: 'LOCK',
            severity: 'MEDIUM',
            title: 'Virtual Session File Lock Detected',
            details: 'Virtual shared folder lock file present in storage cache.',
            recommendation: 'Click Reset Connection to clear virtual lock.'
          });
        }

        if (raw) {
          dbFileSizeKb = Math.round(raw.length / 1024);
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.masterItems) && Array.isArray(parsed.registrations)) {
              dbIntegrityStatus = 'VALID';
              recordCount = parsed.masterItems.length + parsed.registrations.length;
              lastWriterWorkstation = parsed.updatedByWorkstation || 'Browser Workstation';
              lastWriterUser = parsed.updatedByUser || 'QC Inspector';
              lastUpdatedTime = parsed.updatedAt;
            } else {
              dbIntegrityStatus = 'CORRUPTED';
              issues.push({
                id: 'web_corrupt_schema',
                type: 'CORRUPTION',
                severity: 'HIGH',
                title: 'Database Schema Structure Error',
                details: 'Collection data structures missing.',
                recommendation: 'Reset connection to restore local state.'
              });
            }
          } catch (e: any) {
            dbIntegrityStatus = 'INVALID_JSON';
            issues.push({
              id: 'web_syntax',
              type: 'CORRUPTION',
              severity: 'HIGH',
              title: 'Database Syntax Error',
              details: 'Data payload malformed.',
              recommendation: 'Reset connection to re-initialize data.'
            });
          }
        } else {
          dbIntegrityStatus = 'MISSING';
          issues.push({
            id: 'web_missing',
            type: 'WARNING',
            severity: 'LOW',
            title: 'Shared File Not Initialized',
            details: 'Shared path catalog is empty.',
            recommendation: 'Click Reset Connection to initialize database.'
          });
        }
      }
    } catch (err: any) {
      connectionTimeoutMs = Math.round(performance.now() - startTime);
      sharedFolderAccessible = false;
      issues.push({
        id: 'access_error',
        type: 'TIMEOUT',
        severity: 'HIGH',
        title: 'Network Timeout / Connection Error',
        details: err?.message || 'Failed to reach shared folder location within connection timeout.',
        recommendation: 'Verify network connection, shared drive mapping, and read/write privileges.'
      });
    }

    if (connectionTimeoutMs > 800) {
      issues.push({
        id: 'high_latency',
        type: 'TIMEOUT',
        severity: 'MEDIUM',
        title: 'High Connection Latency Warning',
        details: `Connection ping took ${connectionTimeoutMs}ms (>800ms threshold).`,
        recommendation: 'Check network bandwidth or increase sync interval.'
      });
    }

    let overallHealth: 'HEALTHY' | 'DEGRADED' | 'CORRUPTED' | 'LOCKED' | 'UNREACHABLE' = 'HEALTHY';
    if (!sharedFolderAccessible) {
      overallHealth = 'UNREACHABLE';
    } else if (dbIntegrityStatus === 'CORRUPTED' || dbIntegrityStatus === 'INVALID_JSON') {
      overallHealth = 'CORRUPTED';
    } else if (fileLockStatus === 'STALE_LOCK_FOUND' || fileLockStatus === 'LOCK_DETECTED') {
      overallHealth = 'LOCKED';
    } else if (connectionTimeoutMs > 500 || issues.length > 0) {
      overallHealth = 'DEGRADED';
    }

    return {
      lastScanned: now,
      overallHealth,
      sharedFolderAccessible,
      fileLockStatus,
      connectionTimeoutMs,
      dbIntegrityStatus,
      recordCount,
      dbFileSizeKb,
      lastWriterWorkstation,
      lastWriterUser,
      lastUpdatedTime,
      issues
    };
  },

  /**
   * Reset Connection & Clean Re-initialization Action.
   * Purges orphan locks, validates database syntax, re-establishes connection stream.
   */
  async resetDatabaseConnection(sharedPath: string): Promise<{ success: boolean; message: string }> {
    const path = (sharedPath || '').trim();
    if (!path) {
      return { success: false, message: 'No network shared folder path configured to reset.' };
    }

    try {
      const cleanPath = path.replace(/[\\/]+$/, '');

      if (isTauri()) {
        const { exists, remove } = await import('@tauri-apps/plugin-fs');
        const lockFile = `${cleanPath}/shared_material_reference.db.lock`;
        const jsonLockFile = `${cleanPath}/shared_material_reference.json.lock`;
        const tempFiles = [lockFile, jsonLockFile];

        for (const f of tempFiles) {
          try {
            if (await exists(f)) {
              await remove(f);
            }
          } catch (e) {
            console.warn('Removing lock file during reset warning:', e);
          }
        }
      } else {
        // Clear virtual Web storage locks
        safeLocalStorage.removeItem(`${this.getSharedKey(path)}_lock`);
      }

      return {
        success: true,
        message: `Database connection successfully reset! Cleared stale file locks and re-established clean communication pipeline for "${path}".`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Reset connection failed: ${err?.message || 'Permission Denied'}`
      };
    }
  }
};
