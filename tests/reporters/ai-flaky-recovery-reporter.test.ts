/**
 * @jest-environment node
 */
/* eslint-disable import-x/no-nodejs-modules */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  FullResult,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import AiFlakyRecoveryReporter, {
  writeFlakyRecoverySummary,
} from './ai-flaky-recovery-reporter';
import type { FlakyRecoveryRecord } from '../framework/flaky-recovery/FlakyRecoveryTypes';

const record = (
  overrides: Partial<FlakyRecoveryRecord> = {},
): FlakyRecoveryRecord => ({
  schemaVersion: 1,
  test: { title: 'sends ETH', file: 'send.spec.ts', retry: 0 },
  recoveryIndex: 1,
  step: { kind: 'tap', intent: 'tap send', targetDescriptors: [] },
  originalError: 'not displayed',
  source: 'ai',
  cause: 'unexpected-overlay',
  reason: 'promo',
  solution: 'Dismissed the promo',
  fix: { type: 'hide-keyboard' },
  durationMs: 1,
  recoveredAt: '2026-11-25T00:00:00.000Z',
  screenshots: {},
  ...overrides,
});

const result = (
  attachments: { name: string; body?: Buffer }[],
  status = 'passed',
): TestResult => ({ attachments, status }) as unknown as TestResult;

describe('writeFlakyRecoverySummary', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'ai-flaky-reporter-'));
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it('writes nothing when no test was recovered', () => {
    const written = writeFlakyRecoverySummary([], {
      suite: 'local',
      rootDir: workdir,
    });

    expect(written).toBe(false);
    expect(existsSync(join(workdir, 'tests'))).toBe(false);
  });

  it('writes a JSON and markdown summary of every recovery', () => {
    const written = writeFlakyRecoverySummary(
      [
        { record: record(), status: 'passed' },
        {
          record: record({
            test: { title: 'swaps', file: 's.spec.ts', retry: 1 },
          }),
          status: 'failed',
        },
      ],
      {
        suite: 'appium-accounts-android-smoke-1',
        rootDir: workdir,
        runId: '42',
      },
    );

    expect(written).toBe(true);
    const dir = join(workdir, 'tests', 'test-reports', 'ai-flaky-recovery');
    const json = JSON.parse(
      readFileSync(join(dir, 'appium-accounts-android-smoke-1.json'), 'utf8'),
    );
    expect(json).toMatchObject({
      schemaVersion: 1,
      suite: 'appium-accounts-android-smoke-1',
      runId: '42',
    });
    expect(json.recoveries).toHaveLength(2);
    expect(json.recoveries[1].status).toBe('failed');
    const markdown = readFileSync(
      join(dir, 'appium-accounts-android-smoke-1.md'),
      'utf8',
    );
    expect(markdown).toContain('Dismissed the promo');
    expect(markdown).toContain('| sends ETH |');
    expect(markdown).toContain('| swaps |');
  });

  it('appends the summary to the GitHub job summary', () => {
    const stepSummaryPath = join(workdir, 'summary.md');

    writeFlakyRecoverySummary([{ record: record(), status: 'passed' }], {
      suite: 'local',
      rootDir: workdir,
      stepSummaryPath,
    });

    expect(readFileSync(stepSummaryPath, 'utf8')).toContain(
      'Flaky failures recovered by AI',
    );
  });
});

describe('AiFlakyRecoveryReporter', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'ai-flaky-reporter-'));
    jest.spyOn(process, 'cwd').mockReturnValue(workdir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(workdir, { recursive: true, force: true });
  });

  it('collects recovery records from test attachments and writes the report at the end', () => {
    const reporter = new AiFlakyRecoveryReporter();

    reporter.onTestEnd(
      {} as TestCase,
      result([
        {
          name: 'ai-flaky-recovery-1.json',
          body: Buffer.from(JSON.stringify(record())),
        },
        { name: 'ai-flaky-recovery-1.md', body: Buffer.from('# note') },
        { name: 'ai-flaky-recovery-1-before.png', body: Buffer.from('png') },
      ]),
    );
    reporter.onEnd({ status: 'passed' } as FullResult);

    const dir = join(workdir, 'tests', 'test-reports', 'ai-flaky-recovery');
    const json = JSON.parse(readFileSync(join(dir, 'local.json'), 'utf8'));
    expect(json.recoveries).toHaveLength(1);
    expect(json.recoveries[0]).toMatchObject({
      record: { solution: 'Dismissed the promo' },
      status: 'passed',
    });
  });

  it('writes nothing when no attachment is a recovery record', () => {
    const reporter = new AiFlakyRecoveryReporter();

    reporter.onTestEnd(
      {} as TestCase,
      result([
        { name: 'other.json', body: Buffer.from('{}') },
        { name: 'ai-flaky-recovery-1.json', body: Buffer.from('not json') },
        { name: 'ai-flaky-recovery-2.json' },
      ]),
    );
    reporter.onEnd({ status: 'passed' } as FullResult);

    expect(existsSync(join(workdir, 'tests'))).toBe(false);
  });
});
