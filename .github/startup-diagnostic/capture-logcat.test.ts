// Host-only validation. No device, app, wallet, or network is used.
// Run: yarn node --experimental-strip-types --test .github/startup-diagnostic/capture-logcat.test.ts
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const collector = path.join(packageDirectory, 'capture-logcat.py');
const sentinel = 'SYNTHETIC_PRIVATE_PAYLOAD';

// Model the Android16 CLI contract at the only I/O boundary. Its filter parser
// splits at the first colon and rejects unrecognized priority characters.
const fakeAdb = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args.at(-1) === 'get-state') {
  console.log('device');
  process.exit(0);
}
fs.writeFileSync(process.env.FAKE_ADB_RECEIPT, JSON.stringify(args));
const start = args.indexOf('threadtime') + 1;
for (const rule of args.slice(start)) {
  const colon = rule.indexOf(':');
  if (colon <= 0 || !/^[vdiwefs*0-9]$/i.test(rule[colon + 1])) {
    console.error('logcat: Invalid filter expression ' + rule);
    process.exit(1);
  }
}
if (process.env.FAKE_ADB_MODE === 'reject') {
  console.error('logcat: Invalid filter expression ${sentinel}');
  process.exit(1);
}
console.log('10-03 00:00:00.001 123 123 I ReactNativeJS: EngineService: Initializing Engine: ${sentinel}');
console.log('10-03 00:00:00.002 123 123 E AndroidRuntime: java.lang.IllegalStateException: ${sentinel}');
console.log('10-03 00:00:00.003 123 123 E AndroidRuntime: at com.metamask.MainActivity.onCreate(MainActivity.java:77)');
if (process.env.FAKE_ADB_MODE === 'stderr') {
  for (let i = 0; i < 25; i++) console.error('Error: ${sentinel}');
  console.error('${sentinel}' + 'x'.repeat(5000) + 'Error: ${sentinel}');
  console.error('Error: ${sentinel}');
}
setInterval(() => {}, 1000);
`;

interface CaptureSummary {
  captureStatus: string;
  inputLines: number;
  retainedLines: number;
  logcatExitCode: number;
  stderrReadChunks: number;
  stderrOmittedChunks: number;
  stderrFilteredLines: string[];
  stderrTruncated: boolean;
  stderrCaptureComplete: boolean;
}

/** Run the real collector against a disposable fake adb executable. */
async function runCollector(mode: 'capture' | 'stderr' | 'reject') {
  const directory = await mkdtemp(path.join(packageDirectory, '.host-test-'));
  const executable = path.join(directory, 'adb');
  const receipt = path.join(directory, 'adb-args.json');
  const log = path.join(directory, 'logcat.filtered.log');
  const summaryFile = path.join(directory, 'logcat-capture.json');
  await writeFile(executable, fakeAdb);
  await chmod(executable, 0o755);
  const environment = {
    ...process.env,
    PATH: `${directory}${path.delimiter}${process.env.PATH ?? ''}`,
    PYTHONDONTWRITEBYTECODE: '1',
    FAKE_ADB_RECEIPT: receipt,
    FAKE_ADB_MODE: mode,
  };
  const child = spawn('python3', [collector, 'host-test-device', log], {
    env: environment,
    stdio: 'pipe',
    timeout: 10_000,
  });
  const exited = once(child, 'exit');
  let errors = '';
  child.stderr.on('data', (data: Buffer) => {
    errors += data.toString();
  });

  try {
    if (mode !== 'reject') {
      let captured = false;
      for (let poll = 0; poll < 100; poll++) {
        try {
          const output = await readFile(log, 'utf8');
          captured = output.includes('MainActivity.java:77');
          if (mode === 'stderr') {
            // The fake emits all stderr before remaining alive for SIGTERM.
            captured = captured && (await readFile(receipt, 'utf8')).length > 0;
          }
        } catch {
          // The collector has not written the output yet.
        }
        if (captured || child.exitCode !== null) break;
        await delay(20);
      }
      assert.equal(
        captured,
        true,
        'collector did not accept the logcat arguments',
      );
      await delay(100);
      child.kill('SIGTERM');
    }
    const [exitCode] = await exited;
    assert.equal(exitCode, 0, errors);
    const summary = JSON.parse(
      await readFile(summaryFile, 'utf8'),
    ) as CaptureSummary;
    const output = await readFile(log, 'utf8');
    const argumentsUsed = JSON.parse(
      await readFile(receipt, 'utf8'),
    ) as string[];
    return { summary, output, argumentsUsed };
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await exited;
    }
    await rm(directory, { recursive: true, force: true });
  }
}

describe('native startup log collector host contract', () => {
  it('accepts Android filter syntax and captures source-only native evidence', async () => {
    const result = await runCollector('capture');

    assert.equal(result.summary.captureStatus, 'stopped-after-capture');
    assert.ok(result.summary.inputLines > 0);
    assert.ok(result.summary.retainedLines > 0);
    assert.equal(result.summary.stderrCaptureComplete, true);
    assert.ok(result.argumentsUsed.includes('*:E'));
    assert.ok(result.output.includes('MainActivity.java:77'));
    assert.ok(
      result.output.includes('IllegalStateException: <message omitted>'),
    );
    assert.equal(result.output.includes(sentinel), false);
  });

  it('bounds sanitized stderr and omits oversized-line tails', async () => {
    const result = await runCollector('stderr');

    assert.equal(result.summary.stderrFilteredLines.length, 20);
    assert.equal(result.summary.stderrTruncated, true);
    assert.ok(result.summary.stderrReadChunks > 25);
    assert.ok(result.summary.stderrOmittedChunks > 0);
    assert.equal(JSON.stringify(result.summary).includes(sentinel), false);
    assert.ok(
      result.summary.stderrFilteredLines.every(
        (line) => line === 'Error: <message omitted>',
      ),
    );
  });

  it('retains a fixed rejection marker without validating a zero-line capture', async () => {
    const result = await runCollector('reject');

    assert.equal(result.summary.captureStatus, 'logcat-exited');
    assert.equal(result.summary.logcatExitCode, 1);
    assert.equal(result.summary.inputLines, 0);
    assert.deepEqual(result.summary.stderrFilteredLines, [
      'logcat invalid filter expression',
    ]);
    assert.equal(JSON.stringify(result.summary).includes(sentinel), false);
  });
});
