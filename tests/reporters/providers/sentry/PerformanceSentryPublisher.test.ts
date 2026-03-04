jest.mock('../../../framework/logger.ts', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import { publishPerformanceScenarioToSentry } from './PerformanceSentryPublisher';
import type { MetricsOutput } from '../../PerformanceTracker';

function createMetrics(overrides: Partial<MetricsOutput> = {}): MetricsOutput {
  return {
    steps: [
      {
        name: 'Step 1 Load',
        duration: 600,
        baseThreshold: 800,
        threshold: 880,
        validation: {
          passed: true,
          exceeded: null,
          percentOver: null,
        },
      },
      {
        name: 'Step 1/Load',
        duration: 700,
        baseThreshold: 850,
        threshold: 935,
        validation: {
          passed: true,
          exceeded: null,
          percentOver: null,
        },
      },
    ],
    timestamp: '2026-01-01T00:00:00.000Z',
    thresholdMarginPercent: 10,
    team: {
      teamId: 'qa-automation',
      teamName: 'QA Automation',
    },
    total: 1.3,
    totalThreshold: 1815,
    hasThresholds: true,
    totalValidation: {
      passed: true,
      exceeded: null,
      percentOver: null,
    },
    device: {
      name: 'Samsung Galaxy S23 Ultra',
      osVersion: '13.0',
      provider: 'browserstack',
    },
    ...overrides,
  };
}

describe('PerformanceSentryPublisher', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const originalSentryDsn = process.env.E2E_PERFORMANCE_SENTRY_DSN;
  const originalSentrySampleRate =
    process.env.E2E_PERFORMANCE_SENTRY_SAMPLE_RATE;
  const originalSentryEnabled = process.env.E2E_PERFORMANCE_SENTRY_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.E2E_PERFORMANCE_SENTRY_DSN;
    delete process.env.E2E_PERFORMANCE_SENTRY_SAMPLE_RATE;
    delete process.env.E2E_PERFORMANCE_SENTRY_ENABLED;
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    if (originalSentryDsn === undefined) {
      delete process.env.E2E_PERFORMANCE_SENTRY_DSN;
    } else {
      process.env.E2E_PERFORMANCE_SENTRY_DSN = originalSentryDsn;
    }

    if (originalSentrySampleRate === undefined) {
      delete process.env.E2E_PERFORMANCE_SENTRY_SAMPLE_RATE;
    } else {
      process.env.E2E_PERFORMANCE_SENTRY_SAMPLE_RATE = originalSentrySampleRate;
    }

    if (originalSentryEnabled === undefined) {
      delete process.env.E2E_PERFORMANCE_SENTRY_ENABLED;
    } else {
      process.env.E2E_PERFORMANCE_SENTRY_ENABLED = originalSentryEnabled;
    }

    fetchMock.mockRestore();
  });

  it('does not send when DSN is missing', async () => {
    const sent = await publishPerformanceScenarioToSentry({
      metrics: createMetrics(),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      testFilePath: 'tests/performance/onboarding/import-wallet.spec.js',
      tags: ['@PerformanceOnboarding'],
      status: 'passed',
      retry: 0,
      workerIndex: 1,
    });

    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends performance timers as sentry measurements', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const sent = await publishPerformanceScenarioToSentry({
      metrics: createMetrics(),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      testFilePath: 'tests/performance/onboarding/import-wallet.spec.js',
      tags: ['@PerformanceOnboarding', '@PerformanceLaunch'],
      status: 'passed',
      retry: 0,
      workerIndex: 3,
    });

    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [endpoint, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(endpoint).toBe('https://o123.ingest.sentry.io/api/4567/envelope/');
    expect(requestInit).toBeDefined();
    if (!requestInit) {
      throw new Error('Expected request init payload for Sentry request');
    }
    expect(requestInit.method).toBe('POST');

    const body = requestInit.body as string;
    const [, itemHeaderLine, payloadLine] = body.split('\n');
    const itemHeaders = JSON.parse(itemHeaderLine);
    const payload = JSON.parse(payloadLine);

    expect(itemHeaders.type).toBe('transaction');
    expect(payload.transaction).toBe('Import wallet flow');
    expect(payload.measurements.step_1_load.value).toBe(600);
    expect(payload.measurements.step_1_load_2.value).toBe(700);
    expect(payload.measurements.scenario_total_time_ms.value).toBe(1300);
    expect(payload.tags.project_name).toBe('browserstack-android');
    expect(payload.extra.timer_steps).toHaveLength(2);
  });

  it('does not send when sample rate is invalid', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    process.env.E2E_PERFORMANCE_SENTRY_SAMPLE_RATE = '2';

    const sent = await publishPerformanceScenarioToSentry({
      metrics: createMetrics(),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      testFilePath: 'tests/performance/onboarding/import-wallet.spec.js',
      tags: ['@PerformanceOnboarding'],
      status: 'passed',
      retry: 0,
      workerIndex: 0,
    });

    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
