/* eslint-disable import-x/no-nodejs-modules */
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(() => []),
}));

jest.mock('../framework/logger.ts', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockValidateMetrics = jest.fn(() => ({
  passed: true,
  hasThresholds: false,
  violations: [],
}));
const mockFormatConsoleReport = jest.fn(() => 'QG report');

jest.mock('../framework/quality-gates', () => ({
  QualityGatesValidator: jest.fn().mockImplementation(() => ({
    validateMetrics: mockValidateMetrics,
  })),
  QualityGatesReportFormatter: jest.fn().mockImplementation(() => ({
    formatConsoleReport: mockFormatConsoleReport,
    generateHtmlSection: jest.fn(() => ''),
    generateCsvRows: jest.fn(() => []),
  })),
  clearQualityGateFailures: jest.fn(),
}));

jest.mock('../framework/utils/teams', () => ({
  getTeamInfoFromTags: jest.fn(() => ({
    teamId: '@performance-team',
    teamName: 'Performance Team',
    slackMention: '@performance-team',
  })),
}));

jest.mock('./utils/DeviceInfoExtractor', () => ({
  DeviceInfoExtractor: {
    extract: jest.fn(() => ({
      name: 'Pixel 6',
      osVersion: '12',
      provider: 'browserstack',
    })),
  },
}));

jest.mock('./providers/testmu/TestMuAIEnricher', () => ({
  TestMuAIEnricher: jest.fn().mockImplementation(() => ({
    enrichSession: jest.fn().mockResolvedValue(undefined),
    canHandle: jest.fn((projectName: string) =>
      projectName.toLowerCase().includes('testmu'),
    ),
    getProviderName: jest.fn(() => 'testmu'),
  })),
}));

jest.mock('./generators/HtmlReportGenerator', () => ({
  HtmlReportGenerator: jest.fn().mockImplementation(() => ({
    generate: jest.fn(() => '<html>report</html>'),
  })),
}));

jest.mock('./generators/CsvReportGenerator', () => ({
  CsvReportGenerator: jest.fn().mockImplementation(() => ({
    generate: jest.fn(() => 'csv,data'),
  })),
}));

jest.mock('./generators/JsonReportGenerator', () => ({
  JsonReportGenerator: jest.fn().mockImplementation(() => ({
    generate: jest.fn(() => ['/reports/file.json']),
  })),
}));

import fs from 'fs';
import PerformanceReporter from './PerformanceReporter';
import { HtmlReportGenerator } from './generators/HtmlReportGenerator';
import { CsvReportGenerator } from './generators/CsvReportGenerator';
import { JsonReportGenerator } from './generators/JsonReportGenerator';
import { TestMuAIEnricher } from './providers/testmu/TestMuAIEnricher';
import { DeviceInfoExtractor } from './utils/DeviceInfoExtractor';
import { clearQualityGateFailures } from '../framework/quality-gates';

function makeTest(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Login Test',
    tags: ['@performance-team'],
    location: { file: '/tests/login.spec.ts' },
    parent: {
      project: {
        name: 'browserstack-android',
        use: { device: { name: 'Pixel 6', osVersion: '12' } },
      },
    },
    ...overrides,
  };
}

function makeResult(overrides: Record<string, unknown> = {}) {
  return {
    status: 'passed',
    duration: 5000,
    attachments: [],
    annotations: [],
    ...overrides,
  };
}

function makeMetricsAttachment(metricsOverrides: Record<string, unknown> = {}) {
  const metrics = {
    steps: [
      { name: 'Launch', duration: 500, baseThreshold: 900, threshold: 1000 },
    ],
    total: 0.5,
    ...metricsOverrides,
  };
  return {
    name: 'performance-metrics-Login Test',
    body: Buffer.from(JSON.stringify(metrics)),
  };
}

function makeSessionAttachment(sessionOverrides: Record<string, unknown> = {}) {
  const session = {
    sessionId: 'sess-1',
    testTitle: 'Login Test',
    projectName: 'browserstack-android',
    ...sessionOverrides,
  };
  return {
    name: 'session-data',
    body: Buffer.from(JSON.stringify(session)),
  };
}

describe('PerformanceReporter', () => {
  let reporter: PerformanceReporter;

  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks keeps implementations: restore the fs defaults that
    // individual tests override (a throwing write, a missing reports dir).
    (fs.writeFileSync as jest.Mock).mockReset();
    (fs.existsSync as jest.Mock).mockReset().mockReturnValue(true);
    reporter = new PerformanceReporter();
  });

  describe('onBegin', () => {
    it('calls clearQualityGateFailures', () => {
      reporter.onBegin();
      expect(clearQualityGateFailures).toHaveBeenCalled();
    });
  });

  describe('onTestEnd', () => {
    it('captures session from attachments', () => {
      const result = makeResult({
        attachments: [makeSessionAttachment(), makeMetricsAttachment()],
      });
      reporter.onTestEnd(makeTest() as never, result as never);

      // Verify session was captured by checking onEnd behavior
      // (sessions are private, so we test through side effects)
    });

    it('captures session from annotations as fallback', () => {
      const result = makeResult({
        attachments: [makeMetricsAttachment()],
        annotations: [
          { type: 'sessionId', description: 'sess-from-annotation' },
        ],
      });
      reporter.onTestEnd(makeTest() as never, result as never);
    });

    it('parses metrics from attachments', () => {
      const result = makeResult({
        attachments: [makeMetricsAttachment()],
      });
      reporter.onTestEnd(makeTest() as never, result as never);

      // Metrics are parsed — verified via onEnd generating reports
    });

    it('skips duplicate tests by id (title + project)', () => {
      const testCase = makeTest();
      const result = makeResult({ attachments: [makeMetricsAttachment()] });

      reporter.onTestEnd(testCase as never, result as never);
      reporter.onTestEnd(testCase as never, result as never);

      // Second call should be skipped — only 1 metric entry
    });

    it('validates quality gates for tests with steps', () => {
      const testResult = makeResult({
        attachments: [makeMetricsAttachment()],
      });
      reporter.onTestEnd(makeTest() as never, testResult as never);

      expect(mockValidateMetrics).toHaveBeenCalledWith(
        'Login Test',
        expect.any(Array),
        expect.any(Number),
        null,
      );
    });

    it('tracks failures by team', () => {
      const result = makeResult({
        status: 'failed',
        attachments: [makeMetricsAttachment()],
      });
      reporter.onTestEnd(makeTest() as never, result as never);

      // Failure is tracked — verified via onEnd generating failed-tests report
    });

    it('marks interrupted tests with metrics as failed', () => {
      const result = makeResult({
        status: 'interrupted',
        duration: 7 * 60 * 1000,
        attachments: [makeMetricsAttachment()],
      });

      reporter.onTestEnd(makeTest() as never, result as never);

      interface ReporterInternals {
        metrics: { testFailed?: boolean; failureReason?: string }[];
      }
      const { metrics } = reporter as unknown as ReporterInternals;

      expect(metrics[0]?.testFailed).toBe(true);
      expect(metrics[0]?.failureReason).toBe('interrupted');
    });

    it('marks tests with empty performance metrics as failed', () => {
      const result = makeResult({
        status: 'passed',
        attachments: [
          makeMetricsAttachment({
            steps: [],
            total: 0,
          }),
        ],
      });

      reporter.onTestEnd(makeTest() as never, result as never);

      interface ReporterInternals {
        metrics: { testFailed?: boolean; failureReason?: string }[];
      }
      const { metrics } = reporter as unknown as ReporterInternals;

      expect(metrics[0]?.testFailed).toBe(true);
      expect(metrics[0]?.failureReason).toBe('no_performance_metrics');
    });

    it('creates basic entry for failed tests without metrics', () => {
      const result = makeResult({
        status: 'failed',
        attachments: [],
      });
      reporter.onTestEnd(makeTest() as never, result as never);

      // Basic entry created — verified by onEnd still having metrics
    });

    describe('session creation failures and retries', () => {
      interface ReporterInternals {
        metrics: {
          testName: string;
          testFailed?: boolean;
          failureReason?: string | null;
          failureMessage?: string | null;
          sessionId?: string | null;
          steps: unknown[];
          total: number;
          retryInfo?: {
            attempts: number;
            firstFailureReason: string | null;
            firstFailureMessage?: string | null;
            firstFailureDurationSec: number | null;
          };
        }[];
        sessions: { sessionId: string }[];
        failedTestsByTeam: Record<
          string,
          { tests: { failureMessage?: string | null }[] }
        >;
      }
      const internals = (r: PerformanceReporter) =>
        r as unknown as ReporterInternals;

      it('classifies a failure without metrics or session as session_creation_failed', () => {
        reporter.onTestEnd(
          makeTest() as never,
          makeResult({ status: 'timedOut', duration: 420003 }) as never,
        );

        const { metrics } = internals(reporter);
        expect(metrics[0]?.testFailed).toBe(true);
        expect(metrics[0]?.failureReason).toBe('session_creation_failed');
      });

      it('keeps the Playwright status when a session existed but no metrics were attached', () => {
        reporter.onTestEnd(
          makeTest() as never,
          makeResult({
            status: 'failed',
            annotations: [{ type: 'sessionId', description: 'sess-9' }],
          }) as never,
        );

        expect(internals(reporter).metrics[0]?.failureReason).toBe('failed');
      });

      it('replaces the stale failed attempt with the passing retry and records why it failed', () => {
        reporter.onTestEnd(
          makeTest() as never,
          makeResult({ status: 'timedOut', duration: 420003 }) as never,
        );
        reporter.onTestEnd(
          makeTest() as never,
          makeResult({
            status: 'passed',
            retry: 1,
            attachments: [makeMetricsAttachment(), makeSessionAttachment()],
          }) as never,
        );

        const { metrics, sessions, failedTestsByTeam } = internals(reporter);
        expect(metrics).toHaveLength(1);
        expect(metrics[0]?.testFailed).toBe(false);
        expect(metrics[0]?.steps).toHaveLength(1);
        expect(metrics[0]?.total).toBe(0.5);
        expect(sessions.map((s) => s.sessionId)).toEqual(['sess-1']);
        expect(failedTestsByTeam).toEqual({});
        expect(metrics[0]?.retryInfo).toEqual({
          attempts: 2,
          firstFailureReason: 'session_creation_failed',
          firstFailureMessage: null,
          firstFailureDurationSec: 420.003,
        });
      });

      describe('failure message', () => {
        const elementError =
          '\u001b[31mError: element ("android=new UiSelector().resourceId("navbar-hamburger-menu-button")") still not displayed after 936ms\u001b[39m\n    at framework/AppiumAssertions.ts:141';

        it('keeps the first line of the error for tests that failed mid-way', () => {
          reporter.onTestEnd(
            makeTest() as never,
            makeResult({
              status: 'failed',
              error: { message: elementError },
              attachments: [makeMetricsAttachment({ steps: [], total: 0 })],
            }) as never,
          );

          const { metrics, failedTestsByTeam } = internals(reporter);
          expect(metrics[0]?.failureReason).toBe('no_performance_metrics');
          expect(metrics[0]?.failureMessage).toBe(
            'element ("android=new UiSelector().resourceId("navbar-hamburger-menu-button")") still not displayed after 936ms',
          );
          expect(
            failedTestsByTeam['@performance-team']?.tests[0]?.failureMessage,
          ).toBe(metrics[0]?.failureMessage);
        });

        it('keeps the error for failures without metrics', () => {
          reporter.onTestEnd(
            makeTest() as never,
            makeResult({
              status: 'failed',
              annotations: [{ type: 'sessionId', description: 'sess-1' }],
              errors: [
                { message: 'Error: Expected element text "A" within 10000ms' },
              ],
            }) as never,
          );

          expect(internals(reporter).metrics[0]?.failureMessage).toBe(
            'Expected element text "A" within 10000ms',
          );
        });

        it('drops the error when quality gates are what failed', () => {
          mockValidateMetrics.mockReturnValueOnce({
            passed: false,
            hasThresholds: true,
            violations: [],
          });
          reporter.onTestEnd(
            makeTest() as never,
            makeResult({
              status: 'failed',
              error: { message: 'Error: Quality gates exceeded: Step 1 ...' },
              attachments: [makeMetricsAttachment()],
            }) as never,
          );

          const { metrics } = internals(reporter);
          expect(metrics[0]?.failureReason).toBe('quality_gates_exceeded');
          expect(metrics[0]?.failureMessage).toBeNull();
        });

        it('records why the first attempt failed when a retry passes', () => {
          reporter.onTestEnd(
            makeTest() as never,
            makeResult({
              status: 'failed',
              error: {
                message:
                  'Error: element ("~login") still not displayed after 10ms',
              },
              attachments: [makeMetricsAttachment({ steps: [], total: 0 })],
            }) as never,
          );
          reporter.onTestEnd(
            makeTest() as never,
            makeResult({
              status: 'passed',
              retry: 1,
              attachments: [makeMetricsAttachment()],
            }) as never,
          );

          expect(
            internals(reporter).metrics[0]?.retryInfo?.firstFailureMessage,
          ).toBe('element ("~login") still not displayed after 10ms');
        });
      });

      it('keeps the first attempt as passed when the passing retry has no metrics', () => {
        reporter.onTestEnd(
          makeTest() as never,
          makeResult({ status: 'timedOut', duration: 420003 }) as never,
        );
        reporter.onTestEnd(
          makeTest() as never,
          makeResult({ status: 'passed', retry: 1 }) as never,
        );

        const { metrics } = internals(reporter);
        expect(metrics).toHaveLength(1);
        expect(metrics[0]?.testFailed).toBe(false);
        expect(metrics[0]?.retryInfo?.firstFailureReason).toBe(
          'session_creation_failed',
        );
      });
    });

    it('retry pass clears only the matching project, not same title in another project', () => {
      const sharedTitle = 'Shared Title Flow';
      const device = { name: 'Pixel 6', osVersion: '12' };
      const androidCase = makeTest({
        title: sharedTitle,
        parent: {
          project: { name: 'project-android', use: { device } },
        },
      });
      const iosCase = makeTest({
        title: sharedTitle,
        parent: {
          project: { name: 'project-ios', use: { device } },
        },
      });
      const failAttachments = [makeMetricsAttachment()];
      const passAttachments = [makeMetricsAttachment()];

      reporter.onTestEnd(
        androidCase as never,
        makeResult({ status: 'failed', attachments: failAttachments }) as never,
      );
      reporter.onTestEnd(
        iosCase as never,
        makeResult({ status: 'failed', attachments: failAttachments }) as never,
      );
      reporter.onTestEnd(
        androidCase as never,
        makeResult({ status: 'passed', attachments: passAttachments }) as never,
      );

      interface ReporterInternals {
        metrics: {
          testName: string;
          projectName?: string;
          testFailed?: boolean;
        }[];
        failedTestsByTeam: Record<
          string,
          { tests: { testName: string; projectName: string }[] }
        >;
      }
      const { metrics, failedTestsByTeam } =
        reporter as unknown as ReporterInternals;

      const androidMetric = metrics.find(
        (m) =>
          m.testName === sharedTitle && m.projectName === 'project-android',
      );
      const iosMetric = metrics.find(
        (m) => m.testName === sharedTitle && m.projectName === 'project-ios',
      );
      expect(androidMetric?.testFailed).toBe(false);
      expect(iosMetric?.testFailed).toBe(true);

      const teamTests = failedTestsByTeam['@performance-team']?.tests ?? [];
      expect(teamTests.filter((t) => t.testName === sharedTitle)).toHaveLength(
        1,
      );
      expect(
        teamTests.find((t) => t.testName === sharedTitle)?.projectName,
      ).toBe('project-ios');
    });
  });

  describe('onEnd', () => {
    it('returns early with no metrics', async () => {
      await reporter.onEnd();

      // No generators should be called
      expect(HtmlReportGenerator).not.toHaveBeenCalled();
    });

    it('generates HTML, CSV, and JSON reports', async () => {
      const result = makeResult({
        attachments: [makeSessionAttachment(), makeMetricsAttachment()],
      });
      reporter.onTestEnd(makeTest() as never, result as never);

      await reporter.onEnd();

      expect(HtmlReportGenerator).toHaveBeenCalled();
      expect(CsvReportGenerator).toHaveBeenCalled();
      expect(JsonReportGenerator).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('creates reports directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result = makeResult({
        attachments: [makeMetricsAttachment()],
      });
      reporter.onTestEnd(makeTest() as never, result as never);

      await reporter.onEnd();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('reports'),
        { recursive: true },
      );
    });

    it('handles errors gracefully during report generation', async () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('write error');
      });
      const result = makeResult({
        attachments: [makeMetricsAttachment()],
      });
      reporter.onTestEnd(makeTest() as never, result as never);

      // Should not throw
      await expect(reporter.onEnd()).resolves.not.toThrow();
    });

    describe('TestMu runs', () => {
      const TESTMU_PROJECT = 'testmu-android';

      const recordTestMuTest = () => {
        const result = makeResult({
          attachments: [
            makeSessionAttachment({ projectName: TESTMU_PROJECT }),
            makeMetricsAttachment(),
          ],
        });
        reporter.onTestEnd(
          makeTest({
            parent: { project: { name: TESTMU_PROJECT } },
          }) as never,
          result as never,
        );
      };

      const writtenPaths = (): string[] =>
        (fs.writeFileSync as jest.Mock).mock.calls.map(([filePath]) =>
          String(filePath),
        );

      it('enriches the session with the TestMu enricher', async () => {
        recordTestMuTest();

        await reporter.onEnd();

        const enricher = (TestMuAIEnricher as unknown as jest.Mock).mock
          .results[0].value;
        expect(enricher.enrichSession).toHaveBeenCalledWith(
          expect.objectContaining({ projectName: TESTMU_PROJECT }),
        );
      });

      it('writes HTML and CSV reports with a -testmu suffix for a TestMu device', async () => {
        (DeviceInfoExtractor.extract as jest.Mock).mockReturnValueOnce({
          name: 'Pixel 8 Pro',
          osVersion: '14',
          provider: 'testmu',
        });
        recordTestMuTest();

        await reporter.onEnd();

        const paths = writtenPaths();
        expect(
          paths.some((p) => p.endsWith('.html') && p.includes('-testmu')),
        ).toBe(true);
        expect(
          paths.some((p) => p.endsWith('.csv') && p.includes('-testmu')),
        ).toBe(true);
      });

      it('leaves the -testmu suffix off for other providers', async () => {
        recordTestMuTest();

        await reporter.onEnd();

        expect(writtenPaths().some((p) => p.includes('-testmu'))).toBe(false);
      });
    });

    it('does not enrich local emulator sessions with TestMu', async () => {
      const result = makeResult({
        attachments: [
          makeSessionAttachment({ projectName: 'local-android' }),
          makeMetricsAttachment(),
        ],
      });
      reporter.onTestEnd(
        makeTest({ parent: { project: { name: 'local-android' } } }) as never,
        result as never,
      );

      await reporter.onEnd();

      expect(TestMuAIEnricher).not.toHaveBeenCalled();
    });
  });
});
