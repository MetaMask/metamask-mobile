/* eslint-disable import/no-nodejs-modules */
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

jest.mock('../../framework/logger.ts', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import fs from 'fs';
import { JsonReportGenerator } from './JsonReportGenerator';
import type { ReportData, MetricsEntry } from '../types';

const mockWriteFileSync = fs.writeFileSync as jest.Mock;

function makeMetricsEntry(overrides: Partial<MetricsEntry> = {}): MetricsEntry {
  return {
    testName: 'Login Test',
    steps: [],
    total: 1.5,
    device: { name: 'Pixel 6', osVersion: '12', provider: 'browserstack' },
    ...overrides,
  };
}

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    metrics: [makeMetricsEntry()],
    sessions: [],
    failedTestsByTeam: {},
    summary: {
      totalTests: 1,
      passedTests: 1,
      failedTests: 0,
      testsWithSteps: 1,
      testsWithFallbackData: 0,
    },
    ...overrides,
  };
}

describe('JsonReportGenerator', () => {
  let generator: JsonReportGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new JsonReportGenerator();
  });

  it('writes a JSON file per unique device with sanitized filenames', () => {
    const data = makeReportData({
      metrics: [
        makeMetricsEntry({ device: { name: 'Pixel 6', osVersion: '12' } }),
        makeMetricsEntry({
          device: { name: 'iPhone 14 Pro', osVersion: '16.1' },
        }),
      ],
    });

    const files = generator.generate(data, '/reports');

    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    expect(files).toHaveLength(2);

    // Check sanitized device names in paths
    const paths = mockWriteFileSync.mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(
      paths.some((p: string) => p.includes('Pixel_6') && p.includes('12')),
    ).toBe(true);
    expect(
      paths.some(
        (p: string) => p.includes('iPhone_14_Pro') && p.includes('16.1'),
      ),
    ).toBe(true);
  });

  it('groups metrics by device key', () => {
    const data = makeReportData({
      metrics: [
        makeMetricsEntry({
          testName: 'Test A',
          device: { name: 'Pixel 6', osVersion: '12' },
        }),
        makeMetricsEntry({
          testName: 'Test B',
          device: { name: 'Pixel 6', osVersion: '12' },
        }),
        makeMetricsEntry({
          testName: 'Test C',
          device: { name: 'iPhone 14', osVersion: '16' },
        }),
      ],
    });

    generator.generate(data, '/reports');

    // 2 device files (Pixel 6-12 and iPhone 14-16)
    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);

    // Pixel 6 file should contain 2 metrics
    const pixelCall = mockWriteFileSync.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('Pixel_6'),
    );
    const pixelData = JSON.parse(pixelCall[1] as string);
    expect(pixelData).toHaveLength(2);
  });

  it('writes failed-tests-by-team.json with failure normalization', () => {
    const data = makeReportData({
      failedTestsByTeam: {
        '@team-a': {
          team: { teamId: '@team-a', teamName: 'Team A' },
          tests: [
            {
              testName: 'Failing Test',
              testFilePath: '/tests/a.ts',
              tags: ['@team-a'],
              status: 'failed',
              duration: 5000,
              projectName: 'proj',
              sessionId: null,
              qualityGates: {
                passed: false,
                hasThresholds: true,
              } as MetricsEntry['qualityGates'],
              failureReason: 'test_error',
            },
          ],
        },
      },
    });

    const files = generator.generate(data, '/reports');

    // device file + failed-tests file
    expect(files.some((f) => f.includes('failed-tests-by-team.json'))).toBe(
      true,
    );

    const failedCall = mockWriteFileSync.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes('failed-tests-by-team'),
    );
    const parsed = JSON.parse(failedCall[1] as string);
    expect(parsed.totalFailedTests).toBe(1);
    expect(parsed.teamsAffected).toBe(1);
    // Normalization: quality gates that failed → quality_gates_exceeded
    expect(parsed.failedTestsByTeam['@team-a'].tests[0].failureReason).toBe(
      'quality_gates_exceeded',
    );
  });

  it('returns array of written file paths', () => {
    const files = generator.generate(makeReportData(), '/reports');
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files.every((f) => typeof f === 'string')).toBe(true);
  });

  it('skips failed tests report when no failures', () => {
    const data = makeReportData({ failedTestsByTeam: {} });
    const files = generator.generate(data, '/reports');

    expect(files.every((f) => !f.includes('failed-tests-by-team'))).toBe(true);
    // Only the device file should be written
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
  });
});
