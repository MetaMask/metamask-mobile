jest.mock('../../framework/quality-gates', () => ({
  QualityGatesReportFormatter: jest.fn().mockImplementation(() => ({
    generateHtmlSection: jest.fn(
      () => '<div class="quality-gates">QG HTML</div>',
    ),
  })),
}));

import { HtmlReportGenerator } from './HtmlReportGenerator';
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
        validation: { passed: true, exceeded: null, percentOver: null },
      },
      {
        name: 'Enter PIN',
        duration: 300,
        baseThreshold: 450,
        threshold: 500,
        validation: { passed: true, exceeded: null, percentOver: null },
      },
    ],
    total: 0.8,
    totalThreshold: 1500,
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

describe('HtmlReportGenerator', () => {
  let generator: HtmlReportGenerator;

  beforeEach(() => {
    generator = new HtmlReportGenerator();
  });

  it('produces a valid HTML document', () => {
    const html = generator.generate(makeReportData());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
  });

  it('includes test name and device info in heading', () => {
    const html = generator.generate(makeReportData());
    expect(html).toContain('Performance Report - Pixel 6 - OS version: 12');
    expect(html).toContain('Performance Metrics: Login Test - Pixel 6');
  });

  it('generates summary section with pass/fail counts', () => {
    const html = generator.generate(
      makeReportData({
        summary: {
          totalTests: 3,
          passedTests: 2,
          failedTests: 1,
          testsWithSteps: 2,
          testsWithFallbackData: 1,
        },
      }),
    );
    expect(html).toContain('Total Tests:</strong> 3');
    expect(html).toContain('Passed:</strong> 2');
    expect(html).toContain('Failed:</strong> 1');
    expect(html).toContain('Failed tests are included');
  });

  it('shows success note when no failures', () => {
    const html = generator.generate(makeReportData());
    expect(html).toContain('All tests completed successfully');
  });

  it('generates step rows with threshold status icons', () => {
    const html = generator.generate(makeReportData());
    expect(html).toContain('Launch App');
    expect(html).toContain('500 ms');
    expect(html).toContain('1000ms');
    expect(html).toContain('✅');
  });

  it('shows ❌ for failed threshold steps', () => {
    const failedStep = {
      name: 'Slow Step',
      duration: 2000,
      baseThreshold: 900,
      threshold: 1000,
      validation: { passed: false, exceeded: 1000, percentOver: '100.0%' },
    };
    const html = generator.generate(
      makeReportData({
        metrics: [makeMetricsEntry({ steps: [failedStep] })],
      }),
    );
    expect(html).toContain('❌');
    expect(html).toContain('background-color: #ffebee');
  });

  it('generates total time row', () => {
    const html = generator.generate(makeReportData());
    expect(html).toContain('TOTAL TIME');
    expect(html).toContain('0.8 s');
  });

  it('generates failure rows when testFailed', () => {
    const html = generator.generate(
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
    expect(html).toContain('TEST STATUS');
    expect(html).toContain('FAILED');
    expect(html).toContain('timeout');
    expect(html).toContain('Partial data');
  });

  it('does not generate failure rows when test passed', () => {
    const html = generator.generate(makeReportData());
    expect(html).not.toContain('TEST STATUS');
  });

  it('generates video section with links', () => {
    const html = generator.generate(makeReportData());
    expect(html).toContain('Video Recordings');
    expect(html).toContain('href="https://example.com/video"');
    expect(html).toContain('View Recording');
  });

  it('shows "No video available" for sessions without video', () => {
    const html = generator.generate(
      makeReportData({
        sessions: [makeSession({ videoURL: undefined })],
      }),
    );
    expect(html).toContain('No video available');
  });

  it('shows "No video recordings available" for empty sessions', () => {
    const html = generator.generate(makeReportData({ sessions: [] }));
    expect(html).toContain('No video recordings available');
  });

  it('generates profiling cards when profiling data is present', () => {
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
    const html = generator.generate(makeReportData({ sessions: [session] }));
    expect(html).toContain('CPU Usage');
    expect(html).toContain('Memory');
    expect(html).toContain('Battery');
    expect(html).toContain('UI Performance');
    expect(html).toContain('Disk I/O');
    expect(html).toContain('Network I/O');
    expect(html).toContain('No Performance Issues Detected');
  });

  it('generates profiling issues list when issues > 0', () => {
    const session = makeSession({
      profilingData: {
        data: {
          'io.metamask': {
            metrics: {},
            detected_issues: [
              {
                title: 'High CPU',
                subtitle: 'CPU too high',
                current: '90',
                recommended: '50',
                unit: '%',
              },
            ],
          },
        },
      } as SessionData['profilingData'],
      profilingSummary: {
        cpu: { avg: 25, max: 80 },
        memory: { avg: 150, max: 300 },
        battery: { total: 50, percentage: 0.05 },
        uiRendering: { slowFrames: 2, frozenFrames: 0, anrs: 0 },
        diskIO: { reads: 100, writes: 50 },
        networkIO: { upload: 200, download: 500 },
        issues: 1,
      },
    });
    const html = generator.generate(makeReportData({ sessions: [session] }));
    expect(html).toContain('Performance Issues Detected (1)');
    expect(html).toContain('High CPU');
    expect(html).toContain('CPU too high');
  });

  it('delegates quality gates section to formatter', () => {
    const html = generator.generate(
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
    expect(html).toContain('QG HTML');
  });

  it('handles old format steps (key-value objects)', () => {
    const html = generator.generate(
      makeReportData({
        metrics: [
          makeMetricsEntry({
            steps: [{ 'Old Step': 123 }] as unknown as MetricsEntry['steps'],
          }),
        ],
      }),
    );
    expect(html).toContain('Old Step');
    expect(html).toContain('123 ms');
  });
});
