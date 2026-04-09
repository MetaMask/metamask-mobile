jest.mock('../../framework/quality-gates', () => ({
  QualityGatesReportFormatter: jest.fn().mockImplementation(() => ({
    generateCsvRows: jest.fn(() => ['QG_ROW_1', 'QG_ROW_2']),
  })),
}));

import { CsvReportGenerator } from './CsvReportGenerator';
import type { ReportData, MetricsEntry, SessionData } from '../types';

function makeMetricsEntry(overrides: Partial<MetricsEntry> = {}): MetricsEntry {
  return {
    testName: 'Login Test',
    steps: [
      {
        name: 'Launch App',
        duration: 500,
        baseThreshold: 900,
        threshold: 1000,
      },
      { name: 'Enter PIN', duration: 300, baseThreshold: 450, threshold: 500 },
    ],
    total: 0.8,
    device: { name: 'Pixel 6', osVersion: '12', provider: 'browserstack' },
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    sessionId: 'sess-1',
    testTitle: 'Login Test',
    videoURL: 'https://example.com/video',
    ...overrides,
  };
}

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    metrics: [makeMetricsEntry()],
    sessions: [makeSession()],
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

describe('CsvReportGenerator', () => {
  let generator: CsvReportGenerator;

  beforeEach(() => {
    generator = new CsvReportGenerator();
  });

  it('includes test name header and device info', () => {
    const csv = generator.generate(makeReportData());
    expect(csv).toContain('Test: Login Test');
    expect(csv).toContain('Device: Pixel 6 - OS: 12');
  });

  it('includes column headers', () => {
    const csv = generator.generate(makeReportData());
    expect(csv).toContain(
      'Step,Time (ms),CPU Avg (%),Memory Avg (MB),Battery (mAh),Issues',
    );
  });

  it('generates rows for new format steps (name property)', () => {
    const csv = generator.generate(makeReportData());
    expect(csv).toContain('"Launch App"');
    expect(csv).toContain('"500"');
    expect(csv).toContain('"Enter PIN"');
    expect(csv).toContain('"300"');
  });

  it('generates rows for old format steps (key-value)', () => {
    const csv = generator.generate(
      makeReportData({
        metrics: [
          makeMetricsEntry({
            steps: [{ 'Old Step': 123 }] as unknown as MetricsEntry['steps'],
          }),
        ],
      }),
    );
    expect(csv).toContain('"Old Step"');
    expect(csv).toContain('"123"');
  });

  it('includes total time row', () => {
    const csv = generator.generate(makeReportData());
    expect(csv).toContain('TOTAL TIME (s),0.8');
  });

  it('includes profiling summary rows when profiling data is valid', () => {
    const session = makeSession({
      profilingData: {
        data: { 'io.metamask': { metrics: {} } },
      } as SessionData['profilingData'],
      profilingSummary: {
        cpu: { avg: 25, max: 80 },
        memory: { avg: 150, max: 300 },
        battery: { total: 50, percentage: 0.05 },
        uiRendering: { slowFrames: 2, frozenFrames: 0, anrs: 0 },
        diskIO: { reads: 100, writes: 50 },
        networkIO: { upload: 200, download: 500 },
        issues: 0,
      },
    });
    const csv = generator.generate(makeReportData({ sessions: [session] }));
    expect(csv).toContain('PROFILING SUMMARY');
    expect(csv).toContain('CPU Avg,25%');
    expect(csv).toContain('Memory Avg,150 MB');
    expect(csv).toContain('Battery Usage,50 mAh');
  });

  it('includes failure info rows', () => {
    const csv = generator.generate(
      makeReportData({
        metrics: [
          makeMetricsEntry({
            testFailed: true,
            failureReason: 'timeout',
            note: 'Partial data',
          }),
        ],
      }),
    );
    expect(csv).toContain('TEST STATUS,FAILED');
    expect(csv).toContain('FAILURE REASON,"timeout"');
    expect(csv).toContain('NOTE,"Partial data"');
  });

  it('includes quality gates CSV rows', () => {
    const csv = generator.generate(
      makeReportData({
        metrics: [
          makeMetricsEntry({
            qualityGates: {
              passed: true,
              hasThresholds: true,
            } as MetricsEntry['qualityGates'],
          }),
        ],
      }),
    );
    expect(csv).toContain('QG_ROW_1');
    expect(csv).toContain('QG_ROW_2');
  });

  it('separates multiple tests with blank lines', () => {
    const csv = generator.generate(
      makeReportData({
        metrics: [
          makeMetricsEntry({ testName: 'Test A' }),
          makeMetricsEntry({ testName: 'Test B' }),
        ],
      }),
    );
    expect(csv).toContain('Test: Test A');
    expect(csv).toContain('Test: Test B');
    // Multiple blank lines between tests
    const lines = csv.split('\n');
    const testBIndex = lines.findIndex((l) => l.includes('Test: Test B'));
    // There should be blank lines before Test B
    expect(lines[testBIndex - 1]).toBe('');
  });

  it('includes video recording info in CSV', () => {
    const csv = generator.generate(makeReportData());
    expect(csv).toContain('Video Recordings:');
    expect(csv).toContain('Video: https://example.com/video');
  });

  it('shows "Not available" when session has no video', () => {
    const csv = generator.generate(
      makeReportData({
        sessions: [makeSession({ videoURL: undefined })],
      }),
    );
    expect(csv).toContain('Video: Not available');
  });

  it('includes Generated timestamp at the end', () => {
    const csv = generator.generate(makeReportData());
    expect(csv).toContain('Generated:');
  });
});
