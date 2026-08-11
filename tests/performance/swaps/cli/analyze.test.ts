/* eslint-disable import-x/no-nodejs-modules */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeSwapsPerformance, resolveMarkdownReportPath } from './analyze';

function createArtifact() {
  return {
    schemaVersion: 1,
    run: {
      id: 'swaps-perf-001-run',
      scenario: 'open-swaps-fetch-one-eth-quote',
      scenarioId: 'SWAPS-PERF-001',
      scenarioName: 'Open Swaps and fetch a 1 ETH quote',
      scenarioDescription:
        'Measures the work performed while opening Swaps, selecting Ethereum USDC, entering 1 ETH, and waiting for the first positive quote.',
      createdAt: '2026-08-11T00:00:00.000Z',
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
    phases: [],
    capture: null,
    summary: null,
    failure: null,
  };
}

describe('Swaps performance analyzer', () => {
  let temporaryDirectory: string;
  let stdoutWrite: jest.SpyInstance;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'swaps-perf-analyze-'));
    stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('derives a sibling Markdown path from the JSON artifact basename', () => {
    const artifactPath = join(temporaryDirectory, 'swaps-perf-001-run.json');

    const reportPath = resolveMarkdownReportPath(artifactPath);

    expect(reportPath).toBe(join(temporaryDirectory, 'swaps-perf-001-run.md'));
  });

  it('writes the Markdown report beside the analyzed JSON artifact', () => {
    const artifactPath = join(temporaryDirectory, 'swaps-perf-001-run.json');
    const reportPath = join(temporaryDirectory, 'swaps-perf-001-run.md');
    writeFileSync(artifactPath, JSON.stringify(createArtifact()));

    analyzeSwapsPerformance([artifactPath]);

    expect(readFileSync(reportPath, 'utf8')).toContain(
      '# SWAPS-PERF-001 — Open Swaps and fetch a 1 ETH quote',
    );
  });

  it('rejects custom output arguments', () => {
    const analyze = () =>
      analyzeSwapsPerformance(['--latest', '--output', 'report.md']);

    expect(analyze).toThrow('Analyze accepts one artifact path or --latest');
  });
});
