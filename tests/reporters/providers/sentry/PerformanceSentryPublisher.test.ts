jest.mock('../../../framework/logger.ts', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import {
  API_COUNT_ATTRIBUTES,
  publishApiCallsSummaryToSentry,
  publishPerformanceScenarioToSentry,
} from './PerformanceSentryPublisher';
import type { ApiCallsSummary } from '../../types';
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
      name: 'Samsung Galaxy S25 Ultra',
      osVersion: '15.0',
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
  const originalBuildVariant = process.env.E2E_PERFORMANCE_BUILD_VARIANT;
  const originalCiBuildVariant = process.env.E2E_PERFORMANCE_CI_BUILD_VARIANT;
  const originalPerformanceGithubRef =
    process.env.E2E_PERFORMANCE_GITHUB_REF_NAME;
  const originalReleaseVersion = process.env.E2E_PERFORMANCE_RELEASE_VERSION;
  const originalGithubRefName = process.env.GITHUB_REF_NAME;
  const originalGithubServerUrl = process.env.GITHUB_SERVER_URL;
  const originalGithubRepository = process.env.GITHUB_REPOSITORY;
  const originalGithubRunId = process.env.GITHUB_RUN_ID;
  const originalGithubJob = process.env.GITHUB_JOB;

  const restoreEnv = (key: string, original: string | undefined) => {
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.E2E_PERFORMANCE_SENTRY_DSN;
    delete process.env.E2E_PERFORMANCE_SENTRY_SAMPLE_RATE;
    delete process.env.E2E_PERFORMANCE_SENTRY_ENABLED;
    delete process.env.E2E_PERFORMANCE_BUILD_VARIANT;
    delete process.env.E2E_PERFORMANCE_CI_BUILD_VARIANT;
    delete process.env.E2E_PERFORMANCE_GITHUB_REF_NAME;
    delete process.env.E2E_PERFORMANCE_RELEASE_VERSION;
    delete process.env.GITHUB_REF_NAME;
    delete process.env.GITHUB_SERVER_URL;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_RUN_ID;
    delete process.env.GITHUB_JOB;
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    restoreEnv('E2E_PERFORMANCE_SENTRY_DSN', originalSentryDsn);
    restoreEnv('E2E_PERFORMANCE_SENTRY_SAMPLE_RATE', originalSentrySampleRate);
    restoreEnv('E2E_PERFORMANCE_SENTRY_ENABLED', originalSentryEnabled);
    restoreEnv('E2E_PERFORMANCE_BUILD_VARIANT', originalBuildVariant);
    restoreEnv('E2E_PERFORMANCE_CI_BUILD_VARIANT', originalCiBuildVariant);
    restoreEnv('E2E_PERFORMANCE_GITHUB_REF_NAME', originalPerformanceGithubRef);
    restoreEnv('E2E_PERFORMANCE_RELEASE_VERSION', originalReleaseVersion);
    restoreEnv('GITHUB_REF_NAME', originalGithubRefName);
    restoreEnv('GITHUB_SERVER_URL', originalGithubServerUrl);
    restoreEnv('GITHUB_REPOSITORY', originalGithubRepository);
    restoreEnv('GITHUB_RUN_ID', originalGithubRunId);
    restoreEnv('GITHUB_JOB', originalGithubJob);

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
    process.env.E2E_PERFORMANCE_BUILD_VARIANT = 'exp';
    process.env.GITHUB_SERVER_URL = 'https://github.com';
    process.env.GITHUB_REPOSITORY = 'MetaMask/metamask-mobile';
    process.env.GITHUB_RUN_ID = '12345';
    process.env.GITHUB_JOB = 'e2e-performance-android';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const sent = await publishPerformanceScenarioToSentry({
      metrics: createMetrics(),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      testFilePath: 'tests/performance/onboarding/import-wallet.spec.js',
      videoRecordingUrl:
        'https://app-automate.browserstack.com/builds/build-123/sessions/sess-123',
      tags: ['@PerformanceOnboarding', '@PerformanceLaunch'],
      status: 'passed',
      retry: 0,
      workerIndex: 3,
    });

    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [endpoint, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(endpoint).toBeDefined();
    const endpointUrl = new URL(String(endpoint));
    expect(endpointUrl.origin).toBe('https://o123.ingest.sentry.io');
    expect(endpointUrl.pathname).toBe('/api/4567/envelope/');
    expect(endpointUrl.searchParams.get('sentry_key')).toBe('publicKey');
    expect(endpointUrl.searchParams.get('sentry_version')).toBe('7');
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
    expect(payload.tags.build_variant).toBe('exp');
    expect(payload.tags.test_team).toBe('qa-automation');
    expect(payload.extra.timer_steps).toHaveLength(2);
    expect(payload.extra.recording_url).toBe(
      'https://app-automate.browserstack.com/builds/build-123/sessions/sess-123',
    );
    expect(payload.extra.github_job_url).toBe(
      'https://github.com/MetaMask/metamask-mobile/actions/runs/12345',
    );
    expect(payload.extra.github_job_name).toBe('e2e-performance-android');
    expect(payload.spans).toHaveLength(2);
    expect(payload.spans[0].op).toBe('e2e.performance.step');
    expect(payload.spans[0].data.project_name).toBe('browserstack-android');
    expect(payload.spans[0].data.test_team).toBe('qa-automation');
    expect(payload.spans[0].data.provider).toBe('browserstack');
    expect(payload.spans[0].data.team_id).toBe('qa-automation');
    expect(payload.spans[0].data.team_name).toBe('QA Automation');
    expect(payload.spans[0].data.test_status).toBe('passed');
    expect(payload.spans[0].data.retry).toBe(0);
    expect(payload.spans[0].data.worker_index).toBe(3);
    expect(payload.spans[0].data.build_variant).toBe('exp');
    expect(payload.spans[0].data.device_name).toBe('Samsung Galaxy S25 Ultra');
    expect(payload.spans[0].data.device_os_version).toBe('15.0');
    expect(payload.spans[0].data.test_file_path).toBe(
      'tests/performance/onboarding/import-wallet.spec.js',
    );
    expect(payload.spans[0].data.recording_url).toBe(
      'https://app-automate.browserstack.com/builds/build-123/sessions/sess-123',
    );
    expect(payload.spans[0].data.github_job_url).toBe(
      'https://github.com/MetaMask/metamask-mobile/actions/runs/12345',
    );
    expect(payload.spans[0].data.github_job_name).toBe(
      'e2e-performance-android',
    );
  });

  it('protects reserved aggregate keys from timer-key collisions', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const sent = await publishPerformanceScenarioToSentry({
      metrics: createMetrics({
        steps: [
          {
            name: 'scenario_total_time_ms',
            duration: 111,
            baseThreshold: 200,
            threshold: 220,
            validation: {
              passed: true,
              exceeded: null,
              percentOver: null,
            },
          },
          {
            name: 'scenario_total_threshold_ms',
            duration: 222,
            baseThreshold: 300,
            threshold: 330,
            validation: {
              passed: true,
              exceeded: null,
              percentOver: null,
            },
          },
        ],
      }),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      testFilePath: 'tests/performance/onboarding/import-wallet.spec.js',
      tags: ['@PerformanceOnboarding'],
      status: 'passed',
      retry: 0,
      workerIndex: 0,
    });

    expect(sent).toBe(true);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestInit).toBeDefined();
    if (!requestInit) {
      throw new Error('Expected request init payload for Sentry request');
    }

    const body = requestInit.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    // Aggregate keys must remain reserved for totals.
    expect(payload.measurements.scenario_total_time_ms.value).toBe(1300);
    expect(payload.measurements.scenario_total_threshold_ms.value).toBe(1815);
    expect(payload.measurements.scenario_total_time_ms_2.value).toBe(111);
    expect(payload.measurements.scenario_total_threshold_ms_2.value).toBe(222);
  });

  it('keeps long colliding timer keys within 64 characters', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const longName = 'long_timer_step_name_'.repeat(8);
    const sent = await publishPerformanceScenarioToSentry({
      metrics: createMetrics({
        steps: [
          {
            name: longName,
            duration: 333,
            baseThreshold: 400,
            threshold: 440,
            validation: {
              passed: true,
              exceeded: null,
              percentOver: null,
            },
          },
          {
            name: longName,
            duration: 444,
            baseThreshold: 500,
            threshold: 550,
            validation: {
              passed: true,
              exceeded: null,
              percentOver: null,
            },
          },
        ],
      }),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      testFilePath: 'tests/performance/onboarding/import-wallet.spec.js',
      tags: ['@PerformanceOnboarding'],
      status: 'passed',
      retry: 0,
      workerIndex: 0,
    });

    expect(sent).toBe(true);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestInit).toBeDefined();
    if (!requestInit) {
      throw new Error('Expected request init payload for Sentry request');
    }

    const body = requestInit.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    const longTimerKeys = payload.extra.timer_steps
      .filter((step: { name: string }) => step.name === longName)
      .map((step: { key: string }) => step.key);

    expect(longTimerKeys).toHaveLength(2);
    expect(new Set(longTimerKeys).size).toBe(2);
    expect(longTimerKeys.some((key: string) => key.endsWith('_2'))).toBe(true);
    expect(longTimerKeys.every((key: string) => key.length <= 64)).toBe(true);
  });

  it('sends app_size_mb measurement with megabyte unit when appSizeMb is set', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const sent = await publishPerformanceScenarioToSentry({
      metrics: createMetrics({ appSizeMb: 291.62 }),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      testFilePath: 'tests/performance/onboarding/import-wallet.spec.js',
      tags: ['@PerformanceOnboarding'],
      status: 'passed',
      retry: 0,
      workerIndex: 0,
    });

    expect(sent).toBe(true);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestInit).toBeDefined();
    if (!requestInit) {
      throw new Error('Expected request init payload for Sentry request');
    }

    const body = requestInit.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    expect(payload.measurements.app_size_mb).toEqual({
      value: 291.62,
      unit: 'megabyte',
    });
  });

  it('sends when only appSizeMb is set and steps is empty', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const sent = await publishPerformanceScenarioToSentry({
      metrics: createMetrics({ steps: [], appSizeMb: 289.75 }),
      testTitle: 'Send ETH flow',
      projectName: 'browserstack-android',
      testFilePath: 'tests/performance/login/send-eth.spec.ts',
      tags: ['@PerformanceLogin'],
      status: 'passed',
      retry: 0,
      workerIndex: 0,
    });

    expect(sent).toBe(true);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = requestInit?.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    expect(payload.measurements.app_size_mb).toEqual({
      value: 289.75,
      unit: 'megabyte',
    });
    expect(payload.spans).toHaveLength(0);
  });

  it('does not send when steps is empty and appSizeMb is not set', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';

    const sent = await publishPerformanceScenarioToSentry({
      metrics: createMetrics({ steps: [] }),
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

  it('includes profiling measurements when profilingSummary is provided', async () => {
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
      tags: ['@PerformanceOnboarding'],
      status: 'passed',
      retry: 0,
      workerIndex: 0,
      profilingSummary: {
        status: 'completed',
        issues: 1,
        criticalIssues: 0,
        uiRendering: { slowFrames: 12.5, frozenFrames: 2.1, anrs: 0 },
        cpu: { avg: 34.2, max: 78.5, unit: '%' },
        memory: { avg: 210.4, max: 310.8, unit: 'MB' },
      },
    });

    expect(sent).toBe(true);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = requestInit?.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    expect(payload.measurements.profiling_slow_frames_pct.value).toBe(12.5);
    expect(payload.measurements.profiling_slow_frames_pct.unit).toBe('percent');
    expect(payload.measurements.profiling_frozen_frames_pct.value).toBe(2.1);
    expect(payload.measurements.profiling_frozen_frames_pct.unit).toBe(
      'percent',
    );
    expect(payload.measurements.profiling_anrs.value).toBe(0);
    expect(payload.measurements.profiling_anrs.unit).toBe('none');
    expect(payload.measurements.profiling_cpu_avg_pct.value).toBe(34.2);
    expect(payload.measurements.profiling_cpu_avg_pct.unit).toBe('percent');
    expect(payload.measurements.profiling_cpu_max_pct.value).toBe(78.5);
    expect(payload.measurements.profiling_memory_avg_mb.value).toBe(210.4);
    expect(payload.measurements.profiling_memory_avg_mb.unit).toBe('megabyte');
    expect(payload.measurements.profiling_memory_max_mb.value).toBe(310.8);
    expect(payload.extra.profiling_summary.uiRendering.slowFrames).toBe(12.5);
  });

  it('does not include profiling measurements when profilingSummary is absent', async () => {
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
      tags: ['@PerformanceOnboarding'],
      status: 'passed',
      retry: 0,
      workerIndex: 0,
    });

    expect(sent).toBe(true);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = requestInit?.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    expect(payload.measurements.profiling_slow_frames_pct).toBeUndefined();
    expect(payload.measurements.profiling_frozen_frames_pct).toBeUndefined();
    expect(payload.measurements.profiling_anrs).toBeUndefined();
    expect(payload.extra.profiling_summary).toBeNull();
  });

  it('anchors transaction timestamps to testEndTimestamp when provided', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);

    const testEndTimestamp = 1700000000; // fixed Unix seconds
    await publishPerformanceScenarioToSentry({
      metrics: createMetrics({ total: 1.3 }),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      testFilePath: 'tests/performance/onboarding/import-wallet.spec.js',
      tags: [],
      status: 'passed',
      retry: 0,
      workerIndex: 0,
      testEndTimestamp,
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = requestInit?.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    expect(payload.timestamp).toBe(testEndTimestamp);
    // startTimestamp = endTimestamp - totalDurationMs/1000 = 1700000000 - 1.3
    expect(payload.start_timestamp).toBeCloseTo(testEndTimestamp - 1.3, 3);
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

  it('tags RC tracking fields for Sentry Discover filtering', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    process.env.E2E_PERFORMANCE_BUILD_VARIANT = 'rc';
    process.env.E2E_PERFORMANCE_CI_BUILD_VARIANT = 'rc';
    process.env.E2E_PERFORMANCE_RELEASE_VERSION = '7.58.0';
    process.env.GITHUB_REF_NAME = 'release/7.58.0';
    process.env.GITHUB_SERVER_URL = 'https://github.com';
    process.env.GITHUB_REPOSITORY = 'MetaMask/metamask-mobile';
    process.env.GITHUB_RUN_ID = '999888';
    process.env.GITHUB_JOB = 'e2e-performance-android';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

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

    expect(sent).toBe(true);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = requestInit?.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    expect(payload.tags.ci_build_variant).toBe('rc');
    expect(payload.tags.release_version).toBe('7.58.0');
    expect(payload.tags.github_ref).toBe('release/7.58.0');
    expect(payload.tags.github_run_id).toBe('999888');
    expect(payload.tags.tracking_mode).toBe('observe');
    expect(payload.spans[0].data.ci_build_variant).toBe('rc');
    expect(payload.spans[0].data.release_version).toBe('7.58.0');
    expect(payload.spans[0].data.github_ref).toBe('release/7.58.0');
  });

  it('does not use the feature-flags variant as the CI build variant', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    process.env.E2E_PERFORMANCE_BUILD_VARIANT = 'rc';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    await publishPerformanceScenarioToSentry({
      metrics: createMetrics(),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      tags: [],
      status: 'passed',
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = requestInit?.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    expect(payload.tags.build_variant).toBe('rc');
    expect(payload.tags.ci_build_variant).toBe('unknown');
    expect(payload.spans[0].data.ci_build_variant).toBe('unknown');
  });

  it('uses the performance branch override for GitHub tags', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    process.env.GITHUB_REF_NAME = '1234/merge';
    process.env.E2E_PERFORMANCE_GITHUB_REF_NAME = 'release/7.60.0';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    await publishPerformanceScenarioToSentry({
      metrics: createMetrics(),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      tags: [],
      status: 'passed',
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = requestInit?.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    expect(payload.tags.github_ref).toBe('release/7.60.0');
    expect(payload.tags.release_version).toBe('7.60.0');
    expect(payload.spans[0].data.github_ref).toBe('release/7.60.0');
  });

  it('derives release_version from release/* github ref when env is unset', async () => {
    process.env.E2E_PERFORMANCE_SENTRY_DSN =
      'https://publicKey@o123.ingest.sentry.io/4567';
    process.env.E2E_PERFORMANCE_CI_BUILD_VARIANT = 'rc';
    process.env.GITHUB_REF_NAME = 'release/7.59.1';
    process.env.GITHUB_RUN_ID = '111';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    await publishPerformanceScenarioToSentry({
      metrics: createMetrics(),
      testTitle: 'Import wallet flow',
      projectName: 'browserstack-android',
      tags: [],
      status: 'passed',
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = requestInit?.body as string;
    const [, , payloadLine] = body.split('\n');
    const payload = JSON.parse(payloadLine);

    expect(payload.tags.release_version).toBe('7.59.1');
    expect(payload.tags.github_ref).toBe('release/7.59.1');
  });

  describe('publishApiCallsSummaryToSentry', () => {
    const DSN = 'https://publicKey@o123.ingest.sentry.io/4567';

    const capturedSummary: ApiCallsSummary = {
      status: 'captured',
      total: 12,
      unique: 8,
      duplicates: 4,
      failed: 2,
      byHost: { 'api.example.com': 9, 'mainnet.infura.io': 3 },
      topEndpoints: [
        {
          method: 'GET',
          url: 'api.example.com/v1/accounts',
          count: 4,
          failed: 1,
        },
        {
          method: 'POST',
          url: 'mainnet.infura.io/v3/***',
          count: 3,
          failed: 0,
        },
      ],
    };

    const baseOptions = {
      metrics: {
        device: createMetrics().device,
        team: createMetrics().team,
        total: 1.3,
      },
      testTitle: 'Import wallet flow',
      projectName: 'testmu-android',
      testFilePath: 'tests/performance/onboarding/import-wallet.spec.js',
      tags: ['@PerformanceOnboarding'],
      status: 'passed',
      retry: 0,
      workerIndex: 2,
      videoRecordingUrl: 'https://testmu.example/session/1',
      testEndTimestamp: 1_800_000_000,
    };

    const publish = async (summary: ApiCallsSummary) => {
      const sent = await publishApiCallsSummaryToSentry({
        ...baseOptions,
        summary,
      });
      const [, requestInit] = fetchMock.mock.calls[0] ?? [];
      const body = (requestInit?.body as string | undefined) ?? '';
      const [, itemHeaderLine, payloadLine] = body.split('\n');
      return {
        sent,
        itemHeaders: itemHeaderLine ? JSON.parse(itemHeaderLine) : null,
        payload: payloadLine ? JSON.parse(payloadLine) : null,
      };
    };

    beforeEach(() => {
      process.env.E2E_PERFORMANCE_SENTRY_DSN = DSN;
      process.env.E2E_PERFORMANCE_BUILD_VARIANT = 'exp';
      process.env.GITHUB_REF_NAME = 'main';
      process.env.GITHUB_RUN_ID = '12345';
      fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);
    });

    it('does not send when DSN is missing', async () => {
      Reflect.deleteProperty(process.env, 'E2E_PERFORMANCE_SENTRY_DSN');

      const { sent } = await publish(capturedSummary);

      expect(sent).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not send when upload is disabled', async () => {
      process.env.E2E_PERFORMANCE_SENTRY_ENABLED = 'false';

      const { sent } = await publish(capturedSummary);

      expect(sent).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends a dedicated network summary transaction with the scenario name and tags', async () => {
      const { sent, itemHeaders, payload } = await publish(capturedSummary);

      expect(sent).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(itemHeaders.type).toBe('transaction');
      expect(payload.transaction).toBe('Import wallet flow');
      expect(payload.timestamp).toBe(1_800_000_000);
      expect(payload.start_timestamp).toBeCloseTo(1_800_000_000 - 1.3);
      expect(payload.contexts.trace.op).toBe('e2e.performance.network_summary');
      expect(payload.tags).toMatchObject({
        source: 'playwright-e2e-performance',
        project_name: 'testmu-android',
        build_variant: 'exp',
        github_ref: 'main',
        github_run_id: '12345',
        test_team: 'qa-automation',
        provider: 'browserstack',
        api_capture_status: 'captured',
      });
      expect(payload.extra.api_calls_summary).toEqual(capturedSummary);
    });

    it('does not reuse the timing transaction op, measurements or step spans', async () => {
      const { payload } = await publish(capturedSummary);

      expect(payload.contexts.trace.op).not.toBe('e2e.performance.scenario');
      expect(payload.measurements.scenario_total_time_ms).toBeUndefined();
      expect(
        payload.spans.some(
          (span: { op: string }) => span.op === 'e2e.performance.step',
        ),
      ).toBe(false);
    });

    it('puts the request counts on an e2e.performance.network span', async () => {
      const { payload } = await publish(capturedSummary);

      const networkSpans = payload.spans.filter(
        (span: { op: string }) => span.op === 'e2e.performance.network',
      );
      expect(networkSpans).toHaveLength(1);
      expect(networkSpans[0].parent_span_id).toBe(
        payload.contexts.trace.span_id,
      );
      expect(networkSpans[0].data).toMatchObject({
        'api.capture.status': 'captured',
        'api.requests.total': 12,
        'api.requests.unique': 8,
        'api.requests.duplicates': 4,
        'api.requests.failed': 2,
        'api.hosts.count': 2,
        project_name: 'testmu-android',
        build_variant: 'exp',
        github_ref: 'main',
        github_run_id: '12345',
        device_name: 'Samsung Galaxy S25 Ultra',
      });
    });

    it('also sends the totals as transaction measurements', async () => {
      const { payload } = await publish(capturedSummary);

      expect(payload.measurements).toEqual({
        api_requests_total: { value: 12, unit: 'none' },
        api_requests_unique: { value: 8, unit: 'none' },
        api_requests_duplicates: { value: 4, unit: 'none' },
        api_requests_failed: { value: 2, unit: 'none' },
      });
    });

    it('sends one span per host and per top endpoint with the grouping attributes', async () => {
      const { payload } = await publish(capturedSummary);

      const hostSpans = payload.spans.filter(
        (span: { op: string }) => span.op === 'e2e.performance.network.host',
      );
      expect(
        hostSpans.map((span: { data: Record<string, unknown> }) => [
          span.data['api.host'],
          span.data['api.host.requests'],
        ]),
      ).toEqual([
        ['api.example.com', 9],
        ['mainnet.infura.io', 3],
      ]);
      expect(hostSpans[0].data.github_ref).toBe('main');

      const endpointSpans = payload.spans.filter(
        (span: { op: string }) =>
          span.op === 'e2e.performance.network.endpoint',
      );
      expect(endpointSpans).toHaveLength(2);
      expect(endpointSpans[0].description).toBe(
        'GET api.example.com/v1/accounts',
      );
      expect(endpointSpans[0].data).toMatchObject({
        'api.method': 'GET',
        'api.endpoint': 'api.example.com/v1/accounts',
        'api.endpoint.requests': 4,
        'api.endpoint.failed': 1,
        project_name: 'testmu-android',
      });
    });

    it('caps the number of host spans', async () => {
      const byHost = Object.fromEntries(
        Array.from({ length: 30 }, (_, index) => [
          `host-${index}.test`,
          30 - index,
        ]),
      );

      const { payload } = await publish({ ...capturedSummary, byHost });

      const hostSpans = payload.spans.filter(
        (span: { op: string }) => span.op === 'e2e.performance.network.host',
      );
      expect(hostSpans).toHaveLength(20);
      expect(hostSpans[0].data['api.host']).toBe('host-0.test');
      const networkSpan = payload.spans.find(
        (span: { op: string }) => span.op === 'e2e.performance.network',
      );
      expect(networkSpan.data['api.hosts.count']).toBe(30);
    });

    describe('unitless counts', () => {
      const getNetworkSpans = (payload: {
        spans: { op: string; data: Record<string, unknown> }[];
      }) =>
        payload.spans.filter((span) =>
          span.op.startsWith('e2e.performance.network'),
        );

      it('sends every count attribute as a plain integer', async () => {
        const { payload } = await publish(capturedSummary);

        const countKeys = Object.values(API_COUNT_ATTRIBUTES);
        const sentCounts = getNetworkSpans(payload).flatMap((span) =>
          countKeys
            .filter((key) => key in span.data)
            .map((key) => [key, span.data[key]] as const),
        );

        expect(sentCounts.map(([key]) => key).sort()).toEqual(
          [
            'api.requests.total',
            'api.requests.unique',
            'api.requests.duplicates',
            'api.requests.failed',
            'api.hosts.count',
            'api.host.requests',
            'api.host.requests',
            'api.endpoint.requests',
            'api.endpoint.requests',
            'api.endpoint.failed',
            'api.endpoint.failed',
          ].sort(),
        );
        for (const [key, value] of sentCounts) {
          expect({ key, isInteger: Number.isInteger(value) }).toEqual({
            key,
            isInteger: true,
          });
        }
      });

      it('serializes counts as bare JSON integers without a unit or typed wrapper', async () => {
        await publish(capturedSummary);

        const [, requestInit] = fetchMock.mock.calls[0] ?? [];
        const rawPayload = (requestInit?.body as string).split('\n')[2];

        expect(rawPayload).toContain('"api.requests.total":12,');
        expect(rawPayload).toContain('"api.endpoint.requests":4,');
        expect(rawPayload).toContain('"api.host.requests":9,');
        expect(rawPayload).not.toMatch(/"api\.[a-z.]*requests[a-z.]*":\s*\{/u);
      });

      it('never puts a unit on span data', async () => {
        const { payload } = await publish(capturedSummary);

        for (const span of getNetworkSpans(payload)) {
          expect(
            Object.keys(span.data).filter((key) => /unit/iu.test(key)),
          ).toEqual([]);
        }
      });

      it('uses unit none for every measurement', async () => {
        const { payload } = await publish(capturedSummary);

        expect(
          Object.values<{ unit: string }>(payload.measurements).map(
            ({ unit }) => unit,
          ),
        ).toEqual(['none', 'none', 'none', 'none']);
      });

      it('keeps api attribute names free of duration-like tokens', async () => {
        const { payload } = await publish(capturedSummary);

        const apiKeys = getNetworkSpans(payload).flatMap((span) =>
          Object.keys(span.data).filter((key) => key.startsWith('api.')),
        );

        expect(apiKeys.length).toBeGreaterThan(0);
        expect(
          apiKeys.filter((key) =>
            /duration|time|latency|(^|[._])ms($|[._])|elapsed|delay/iu.test(
              key,
            ),
          ),
        ).toEqual([]);
        expect(
          Object.keys(payload.measurements).filter((key) =>
            /duration|time|latency|(^|_)ms($|_)/iu.test(key),
          ),
        ).toEqual([]);
      });
    });

    it('sends zero requests as a real count', async () => {
      const { payload } = await publish({
        status: 'captured',
        total: 0,
        unique: 0,
        duplicates: 0,
        failed: 0,
        byHost: {},
        topEndpoints: [],
      });

      expect(payload.measurements.api_requests_total.value).toBe(0);
      expect(payload.spans).toHaveLength(1);
      expect(payload.spans[0].data['api.requests.total']).toBe(0);
      expect(payload.tags.api_capture_status).toBe('captured');
    });

    it('marks a failed capture without sending any counts', async () => {
      const { sent, payload } = await publish({
        status: 'error',
        error: 'HAR download failed',
      });

      expect(sent).toBe(true);
      expect(payload.tags.api_capture_status).toBe('error');
      expect(payload.measurements).toEqual({});
      expect(payload.spans).toHaveLength(1);
      expect(payload.spans[0].op).toBe('e2e.performance.network');
      expect(payload.spans[0].data['api.capture.status']).toBe('error');
      expect(payload.spans[0].data['api.capture.error']).toBe(
        'HAR download failed',
      );
      expect(payload.spans[0].data['api.requests.total']).toBeUndefined();
    });

    it('returns false when Sentry rejects the envelope', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 429 } as Response);

      const { sent } = await publish(capturedSummary);

      expect(sent).toBe(false);
    });

    it('returns false when the request throws', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const { sent } = await publish(capturedSummary);

      expect(sent).toBe(false);
    });
  });
});
