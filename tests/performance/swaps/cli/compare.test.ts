/* eslint-disable import-x/no-nodejs-modules */
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  compareSwapsPerformanceRuns,
  resolveComparisonDirectory,
} from './compare';

function createArtifact(id: string, createdAt: string) {
  return {
    schemaVersion: 1,
    run: {
      id,
      scenario: 'open-swaps-fetch-one-eth-quote',
      scenarioId: 'SWAPS-PERF-001',
      scenarioName: 'Open Swaps and fetch a 1 ETH quote',
      scenarioDescription:
        'Measures the work performed while opening Swaps, selecting Ethereum USDC, entering 1 ETH, and waiting for the first positive quote.',
      createdAt,
      commit: 'abc1234',
      platform: 'ios-simulator',
      metroPort: 8081,
      status: 'passed',
    },
    preconditions: {
      walletUnlocked: true,
      sourceTokenText: 'ETH',
      destinationToken: 'USDC',
      sourceAmount: '1',
    },
    phases: [
      {
        name: 'fetch-first-quote',
        startedAt: 100,
        endedAt: 200,
        durationMs: 100,
      },
    ],
    capture: {
      enabled: false,
      startedAt: 0,
      markers: [],
      renders: { BridgeView: { count: 2, timestamps: [] } },
      network: [],
      console: [],
    },
    summary: {
      networkRequests: 0,
      failedNetworkRequests: 0,
      consoleErrors: 0,
      renders: { BridgeView: 2 },
      networkRequestsByPhase: { 'fetch-first-quote': 0 },
      slowestNetworkRequests: [],
    },
    failure: null,
  };
}

describe('Swaps performance comparison CLI', () => {
  let temporaryDirectory: string;
  let stdoutWrite: jest.SpyInstance;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'swaps-perf-compare-'));
    stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('requires exactly one scenario folder path', () => {
    expect(() => resolveComparisonDirectory([])).toThrow(
      'Compare accepts exactly one scenario folder path',
    );
    expect(() => resolveComparisonDirectory(['one', 'two'])).toThrow(
      'Compare accepts exactly one scenario folder path',
    );
  });

  it('reads direct JSON artifacts and writes comparison.md', () => {
    writeFileSync(
      join(temporaryDirectory, 'first.json'),
      JSON.stringify(createArtifact('first', '2026-08-11T00:00:00.000Z')),
    );
    writeFileSync(
      join(temporaryDirectory, 'second.json'),
      JSON.stringify(createArtifact('second', '2026-08-11T00:01:00.000Z')),
    );
    const nestedDirectory = join(temporaryDirectory, 'nested');
    mkdirSync(nestedDirectory);
    writeFileSync(join(nestedDirectory, 'invalid.json'), 'not JSON');

    compareSwapsPerformanceRuns([temporaryDirectory]);

    expect(
      readFileSync(join(temporaryDirectory, 'comparison.md'), 'utf8'),
    ).toContain('# SWAPS-PERF-001 — Within-commit comparison');
  });

  it('fails with the filename when a direct artifact is invalid', () => {
    writeFileSync(join(temporaryDirectory, 'broken.json'), 'not JSON');

    expect(() => compareSwapsPerformanceRuns([temporaryDirectory])).toThrow(
      'Invalid JSON in broken.json',
    );
  });
});
