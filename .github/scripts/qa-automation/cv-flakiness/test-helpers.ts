/**
 * Shared helpers for the cv-flakiness script tests. Both suites drive the same
 * runRepetitions core through the spawned scripts with a stubbed Jest, so the
 * stub and its bookkeeping live here to keep the two suites from drifting.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export interface JestStubCall {
  seed: string;
  files: string[];
}

export interface JestStubOptions {
  failSubstring?: string;
  sleepMs?: number;
  hangAfterReport?: boolean;
}

const createdDirs: string[] = [];

/** New temp directory, registered for cleanupTempDirs. */
export function newTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

/** Remove every directory created with newTempDir since the last cleanup. */
export function cleanupTempDirs(): void {
  for (const dir of createdDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Empty file standing in for a component view test path. */
export function makeCvFile(dir: string, name: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, '');
  return filePath;
}

/**
 * Jest stub: writes a minimal Jest JSON report and logs every invocation.
 * `failSubstring` fails matching files, `sleepMs` delays the stub before
 * writing/exiting, `hangAfterReport` writes the report up front and then
 * outlives the spawn timeout so the run is killed after its report exists.
 */
export function writeJestStub(stubDir: string, options: JestStubOptions = {}): string {
  const stubPath = path.join(stubDir, 'jest-stub.cjs');
  writeFileSync(
    stubPath,
    `
const fs = require('node:fs');
const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : ''; };
const outputFile = option('--outputFile');
const files = args.filter((arg, i) => /\.view\.test\.tsx?$/.test(arg) && !['--outputFile', '--seed'].includes(args[i - 1]));
fs.appendFileSync(process.env.STUB_CALLS_PATH, JSON.stringify({ seed: option('--seed'), files }) + '\\n');
const failSubstring = ${JSON.stringify(options.failSubstring ?? '')};
const sleepMs = ${JSON.stringify(options.sleepMs ?? 0)};
const hangAfterReport = ${JSON.stringify(options.hangAfterReport ?? false)};
const forcedExit = Number(process.env.STUB_EXIT_CODE || '');
const stubReport = process.env.STUB_REPORT || '';
const writeReport = () => {
  if (stubReport === 'invalid') {
    if (outputFile) fs.writeFileSync(outputFile, '{"testResults": [');
    return true;
  }
  const runtime = stubReport === 'runtime';
  const testResults = files.map((file) => {
    const failed = Boolean(failSubstring) && file.includes(failSubstring);
    const entry = {
      name: file,
      status: failed ? 'failed' : 'passed',
      assertionResults: [{
        fullName: failed ? 'Stub failing test name' : 'Stub passing test name',
        status: failed ? 'failed' : 'passed',
        failureMessages: failed ? ['Stub failure message'] : [],
      }],
    };
    if (runtime) {
      entry.status = 'failed';
      entry.testExecError = 'Cannot find module ../../../missingModule';
    }
    return entry;
  });
  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify({ testResults, numRuntimeErrorTestSuites: runtime ? 1 : 0 }));
  }
  return testResults.some((result) => result.status === 'failed');
};
const exitWith = (anyFailed) => process.exit(Number.isFinite(forcedExit) ? forcedExit : anyFailed ? 1 : 0);
if (hangAfterReport) {
  // Write the report up front, then keep running past the budget deadline so
  // spawnSync kills the run after its report exists.
  const anyFailed = writeReport();
  setTimeout(() => exitWith(anyFailed), sleepMs);
} else {
  setTimeout(() => exitWith(writeReport()), sleepMs);
}
`,
  );
  return stubPath;
}

/** Every stub invocation logged to the calls JSONL file, in run order. */
export function readStubCalls(callsPath: string): JestStubCall[] {
  return existsSync(callsPath)
    ? readFileSync(callsPath, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as JestStubCall)
    : [];
}
