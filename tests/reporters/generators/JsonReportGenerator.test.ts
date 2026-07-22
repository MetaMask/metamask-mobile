/* eslint-disable import-x/no-nodejs-modules */
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
import path from 'path';
import { JsonReportGenerator } from './JsonReportGenerator';
import type { ReportData, MetricsEntry, FailedTestEntry } from '../types';

const mockWriteFileSync = fs.writeFileSync as jest.Mock;
const mockExistsSync = fs.existsSync as jest.Mock;
const mockMkdirSync = fs.mkdirSync as jest.Mock;

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
    mockExistsSync.mockReturnValue(true);
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
      (c[0] as string).includes('performance-metrics') &&
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
              } as FailedTestEntry['qualityGates'],
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
    // Only the device file should be written (no profiling data on metrics)
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
  });

  describe('per-scenario app profiling artifacts', () => {
    it('writes one app-profiling file per scenario with profiling and apiCalls', () => {
      const apiCalls = [
        {
          method: 'GET',
          url: 'https://api.example.com/v1/accounts',
          status: 200,
          time: 120,
        },
      ];
      const profilingSummary = {
        cpu: { avg: 20, max: 40, unit: '%' },
        memory: { avg: 100, max: 150, unit: 'MB' },
        issues: 0,
      };
      const profilingData = { data: { 'io.metamask': { metrics: {} } } };

      const data = makeReportData({
        metrics: [
          makeMetricsEntry({
            testName: 'Cold Start Login',
            projectName: 'browserstack-android',
            sessionId: 'session-1',
            timestamp: '2026-07-22T12:00:00.000Z',
            profilingSummary,
            profilingData: profilingData as MetricsEntry['profilingData'],
            apiCalls,
          }),
          makeMetricsEntry({
            testName: 'Warm Start Wallet',
            projectName: 'browserstack-android',
            sessionId: 'session-2',
            timestamp: '2026-07-22T12:01:00.000Z',
            profilingSummary,
            profilingData: profilingData as MetricsEntry['profilingData'],
            apiCalls,
          }),
          makeMetricsEntry({
            testName: 'Send ETH',
            projectName: 'browserstack-android',
            sessionId: 'session-3',
            timestamp: '2026-07-22T12:02:00.000Z',
            profilingSummary,
            profilingData: profilingData as MetricsEntry['profilingData'],
            apiCalls,
          }),
        ],
      });

      const files = generator.generate(data, '/reports');

      const profilingFiles = files.filter((f) =>
        f.includes(`${path.sep}app-profiling${path.sep}`),
      );
      expect(profilingFiles).toHaveLength(3);

      const profilingWrites = mockWriteFileSync.mock.calls.filter(
        (c: unknown[]) =>
          (c[0] as string).includes(`${path.sep}app-profiling${path.sep}`),
      );
      expect(profilingWrites).toHaveLength(3);

      const firstArtifact = JSON.parse(profilingWrites[0][1] as string);
      expect(firstArtifact).toMatchObject({
        testName: 'Cold Start Login',
        projectName: 'browserstack-android',
        sessionId: 'session-1',
        profilingSummary,
        apiCalls,
      });
      expect(firstArtifact.profilingData).toEqual(profilingData);
    });

    it('creates the app-profiling directory when missing', () => {
      mockExistsSync.mockReturnValue(false);

      const data = makeReportData({
        metrics: [
          makeMetricsEntry({
            profilingSummary: { issues: 0 },
            apiCalls: [],
          }),
        ],
      });

      generator.generate(data, '/reports');

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(`${path.sep}app-profiling`),
        { recursive: true },
      );
    });

    it('skips scenarios without profiling or api call data', () => {
      const data = makeReportData({
        metrics: [
          makeMetricsEntry({ testName: 'No Profiling' }),
          makeMetricsEntry({
            testName: 'With Profiling',
            profilingSummary: { issues: 1 },
          }),
        ],
      });

      const files = generator.generate(data, '/reports');
      const profilingFiles = files.filter((f) => f.includes('app-profiling'));
      expect(profilingFiles).toHaveLength(1);
      expect(profilingFiles[0]).toContain('With_Profiling');
    });

    it('writes a file when only apiCalls are present', () => {
      const data = makeReportData({
        metrics: [
          makeMetricsEntry({
            testName: 'API Only Scenario',
            apiCalls: [
              { method: 'POST', url: 'https://api.example.com/rpc', status: 200 },
            ],
          }),
        ],
      });

      const files = generator.generate(data, '/reports');
      const profilingFiles = files.filter((f) => f.includes('app-profiling'));
      expect(profilingFiles).toHaveLength(1);

      const write = mockWriteFileSync.mock.calls.find(
        (c: unknown[]) =>
          (c[0] as string).includes(`${path.sep}app-profiling${path.sep}`) &&
          (c[0] as string).includes('API_Only_Scenario'),
      );
      expect(write).toBeDefined();
      const artifact = JSON.parse(write[1] as string);
      expect(artifact.apiCalls).toHaveLength(1);
      expect(artifact.profilingData).toBeNull();
    });

    it('disambiguates colliding filenames', () => {
      const data = makeReportData({
        metrics: [
          makeMetricsEntry({
            testName: 'Same Title',
            projectName: 'proj',
            profilingSummary: { issues: 0 },
          }),
          makeMetricsEntry({
            testName: 'Same Title',
            projectName: 'proj',
            profilingSummary: { issues: 1 },
          }),
        ],
      });

      const files = generator.generate(data, '/reports');
      const profilingFiles = files.filter((f) => f.includes('app-profiling'));
      expect(profilingFiles).toHaveLength(2);
      expect(profilingFiles[0]).not.toEqual(profilingFiles[1]);
      expect(profilingFiles.some((f) => f.endsWith('-2.json'))).toBe(true);
    });
  });
});
