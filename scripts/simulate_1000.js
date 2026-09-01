/**
 * 1,000-Iteration Database & Connection Health Stress Test Simulator
 */

import { performance } from 'perf_hooks';

// In-Memory Virtual Shared Network Directory simulation state
class VirtualNetworkDrive {
  constructor(sharedPath) {
    this.sharedPath = sharedPath;
    this.storage = new Map();
    this.locks = new Map();
    this.latencyMs = 1; // Simulated network roundtrip latency
  }

  async checkAccess() {
    await this.delay(this.latencyMs);
    if (!this.sharedPath) throw new Error("Empty path");
    return true;
  }

  async read(key) {
    await this.delay(this.latencyMs);
    return this.storage.get(key) || null;
  }

  async write(key, value) {
    await this.delay(this.latencyMs);
    // Check lock
    const lockKey = `${key}.lock`;
    if (this.locks.has(lockKey)) {
      const lock = this.locks.get(lockKey);
      if (Date.now() - lock.time < 120000) {
        throw new Error(`File locked by workstation ${lock.workstation}`);
      }
    }
    this.storage.set(key, value);
    return true;
  }

  async acquireLock(key, workstation) {
    const lockKey = `${key}.lock`;
    this.locks.set(lockKey, { time: Date.now(), workstation });
  }

  async releaseLock(key) {
    const lockKey = `${key}.lock`;
    this.locks.delete(lockKey);
  }

  async delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

// Simulated Diagnostic Engine
class DiagnosticEngine {
  constructor(drive) {
    this.drive = drive;
  }

  async scanDatabaseHealth() {
    const start = performance.now();
    const issues = [];
    let sharedFolderAccessible = false;
    let fileLockStatus = 'NO_LOCKS';
    let dbIntegrityStatus = 'MISSING';
    let recordCount = 0;
    let dbFileSizeKb = 0;
    let lastWriterWorkstation = undefined;

    try {
      sharedFolderAccessible = await this.drive.checkAccess();
      const rawDb = await this.drive.read('shared_material_reference.json');

      if (this.drive.locks.size > 0) {
        fileLockStatus = 'LOCK_DETECTED';
        issues.push({ id: 'active_lock', type: 'LOCK', severity: 'LOW', title: 'Active Write Lock' });
      }

      if (rawDb) {
        dbFileSizeKb = Math.round(rawDb.length / 1024);
        const parsed = JSON.parse(rawDb);
        if (Array.isArray(parsed.masterItems) && Array.isArray(parsed.registrations)) {
          dbIntegrityStatus = 'VALID';
          recordCount = parsed.masterItems.length + parsed.registrations.length;
          lastWriterWorkstation = parsed.updatedByWorkstation;
        } else {
          dbIntegrityStatus = 'CORRUPTED';
          issues.push({ id: 'corrupt', type: 'CORRUPTION', severity: 'HIGH', title: 'Schema Corrupted' });
        }
      } else {
        dbIntegrityStatus = 'MISSING';
      }
    } catch (err) {
      sharedFolderAccessible = false;
      issues.push({ id: 'err', type: 'TIMEOUT', severity: 'HIGH', title: err.message });
    }

    const latency = Math.round(performance.now() - start);
    let overallHealth = 'HEALTHY';
    if (!sharedFolderAccessible) overallHealth = 'UNREACHABLE';
    else if (dbIntegrityStatus === 'CORRUPTED') overallHealth = 'CORRUPTED';
    else if (fileLockStatus !== 'NO_LOCKS') overallHealth = 'LOCKED';

    return {
      overallHealth,
      sharedFolderAccessible,
      fileLockStatus,
      connectionTimeoutMs: latency,
      dbIntegrityStatus,
      recordCount,
      dbFileSizeKb,
      lastWriterWorkstation,
      issues
    };
  }

  async resetConnection() {
    this.drive.locks.clear();
    return { success: true, message: "Connection reset successfully." };
  }
}

async function runSimulation() {
  console.log("=================================================");
  console.log("STARTING 1,000-CYCLE DATABASE & CONNECTION SIMULATION");
  console.log("=================================================");

  const drive = new VirtualNetworkDrive("\\\\192.168.1.100\\QA_ReferenceTracker_Shared\\");
  const engine = new DiagnosticEngine(drive);

  // Initialize DB data payload
  const initialPayload = JSON.stringify({
    masterItems: Array.from({ length: 50 }, (_, i) => ({ id: `ITEM-${i}`, name: `Material Grade ${i}` })),
    registrations: Array.from({ length: 120 }, (_, i) => ({ id: `REG-${i}`, code: `SPEC-${i}` })),
    updatedByWorkstation: "WORKSTATION-01",
    updatedByUser: "QC Inspector",
    updatedAt: new Date().toISOString()
  });

  await drive.write('shared_material_reference.json', initialPayload);

  let passedIterations = 0;
  let failedIterations = 0;
  let totalLatency = 0;
  let lockResetsPerformed = 0;
  let readWriteOpsPerformed = 0;
  let integrityChecksPassed = 0;

  const startTimeTotal = performance.now();

  for (let i = 1; i <= 1000; i++) {
    try {
      // 1. Diagnostics Scan
      const report = await engine.scanDatabaseHealth();
      totalLatency += report.connectionTimeoutMs;

      // 2. Perform Read
      const dataStr = await drive.read('shared_material_reference.json');
      const data = JSON.parse(dataStr);
      if (data.masterItems.length === 50 && data.registrations.length === 120) {
        integrityChecksPassed++;
      }

      // 3. Simulated write operation every 10 iterations
      if (i % 10 === 0) {
        await drive.acquireLock('shared_material_reference.json', `WORKSTATION-${(i % 5) + 1}`);
        data.updatedAt = new Date().toISOString();
        data.updatedByWorkstation = `WORKSTATION-${(i % 5) + 1}`;
        await drive.releaseLock('shared_material_reference.json');
        await drive.write('shared_material_reference.json', JSON.stringify(data));
        readWriteOpsPerformed++;
      }

      // 4. Simulated Lock Contention & Reset Connection test every 50 iterations
      if (i % 50 === 0) {
        await drive.acquireLock('shared_material_reference.json', "STALE-PC");
        const lockReport = await engine.scanDatabaseHealth();
        if (lockReport.fileLockStatus === 'LOCK_DETECTED' || lockReport.fileLockStatus === 'STALE_LOCK_FOUND') {
          await engine.resetConnection();
          lockResetsPerformed++;
        }
      }

      passedIterations++;
    } catch (err) {
      console.error(`Iteration ${i} failed:`, err.message);
      failedIterations++;
    }
  }

  const durationMs = Math.round(performance.now() - startTimeTotal);
  const avgLatency = (totalLatency / 1000).toFixed(2);
  const successRate = ((passedIterations / 1000) * 100).toFixed(2);
  const isPass = failedIterations === 0 && passedIterations === 1000;

  console.log("\n-------------------------------------------------");
  console.log("SIMULATION SUMMARY RESULTS (1000 CYCLES)");
  console.log("-------------------------------------------------");
  console.log(`Total Cycles Run        : 1,000`);
  console.log(`Passed Cycles           : ${passedIterations}`);
  console.log(`Failed Cycles           : ${failedIterations}`);
  console.log(`Success Rate            : ${successRate}%`);
  console.log(`Total Execution Time    : ${durationMs} ms`);
  console.log(`Average Latency per Scan: ${avgLatency} ms`);
  console.log(`Read/Write Mutations    : ${readWriteOpsPerformed}`);
  console.log(`Lock Resets Executed    : ${lockResetsPerformed}`);
  console.log(`Integrity Checks Passed : ${integrityChecksPassed}/1000`);
  console.log("-------------------------------------------------");
  console.log(`FINAL RESULT STATUS     : ${isPass ? 'PASS' : 'FAIL'}`);
  console.log("=================================================\n");
}

runSimulation();
