/* eslint-disable import-x/no-nodejs-modules */
import { randomUUID } from 'node:crypto';
import { createLogger } from '../../../framework/logger';
import type { MetricsOutput } from '../../PerformanceTracker';

const logger = createLogger({ name: 'PerformanceSentryPublisher' });

const DEFAULT_ENVIRONMENT = 'e2e-performance';
const DEFAULT_SAMPLE_RATE = 1;
const ENV_SENTRY_DSN = 'E2E_PERFORMANCE_SENTRY_DSN';
const ENV_SENTRY_ENABLED = 'E2E_PERFORMANCE_SENTRY_ENABLED';
const ENV_SENTRY_SAMPLE_RATE = 'E2E_PERFORMANCE_SENTRY_SAMPLE_RATE';
const ENV_SENTRY_ENVIRONMENT = 'E2E_PERFORMANCE_SENTRY_ENVIRONMENT';
const ENV_SENTRY_RELEASE = 'E2E_PERFORMANCE_SENTRY_RELEASE';
const ENV_SENTRY_BUILD_VARIANT = 'E2E_PERFORMANCE_BUILD_VARIANT';
const ENV_GITHUB_SERVER_URL = 'GITHUB_SERVER_URL';
const ENV_GITHUB_REPOSITORY = 'GITHUB_REPOSITORY';
const ENV_GITHUB_RUN_ID = 'GITHUB_RUN_ID';
const ENV_GITHUB_JOB = 'GITHUB_JOB';
const MAX_MEASUREMENT_KEY_LENGTH = 64;
const RESERVED_MEASUREMENT_KEYS = [
  'scenario_total_time_ms',
  'scenario_total_threshold_ms',
] as const;

interface PublishPerformanceScenarioOptions {
  metrics: MetricsOutput;
  testTitle: string;
  projectName: string;
  testFilePath?: string;
  browserstackRecordingUrl?: string | null;
  tags: string[];
  status?: string;
  retry?: number;
  workerIndex?: number;
}

interface ParsedSentryDsn {
  dsn: string;
  endpoint: string;
  projectId: string;
  publicKey: string;
}

interface TimerMeasurement {
  key: string;
  name: string;
  duration: number;
  threshold: number | null;
  baseThreshold: number | null;
  passed: boolean | null;
  exceeded: number | null;
  percentOver: string | null;
}

interface SentryMeasurement {
  value: number;
  unit: 'millisecond';
}

interface MirroredScenarioAttributes {
  project_name: string;
  test_team: string;
  provider: string;
  team_id: string;
  team_name: string;
  test_status: string;
  retry: number;
  worker_index: number;
  build_variant: 'rc' | 'exp' | 'unknown';
  device_name: string;
  device_os_version: string;
  test_file_path: string;
  recording_url: string | null;
  github_job_url: string | null;
  github_job_name: string | null;
}

function getEnvValue(key: string): string | undefined {
  return Reflect.get(process.env, key) as string | undefined;
}

function createHexId(length: number): string {
  return randomUUID().replace(/-/gu, '').slice(0, length);
}

function normalizeSpanStatus(status?: string): string {
  switch (status) {
    case 'passed':
      return 'ok';
    case 'timedOut':
      return 'deadline_exceeded';
    case 'failed':
      return 'internal_error';
    case 'skipped':
      return 'cancelled';
    default:
      return 'unknown_error';
  }
}

function normalizeBuildVariant(variant?: string): 'rc' | 'exp' | 'unknown' {
  if (variant === 'rc' || variant === 'exp') {
    return variant;
  }

  return 'unknown';
}

function sanitizeMeasurementKey(name: string): string {
  const baseKey = name
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gu, '_')
    .replace(/_+/gu, '_')
    .replace(/^_+|_+$/gu, '');

  if (!baseKey) {
    return 'timer_measurement';
  }

  if (/^[0-9]/u.test(baseKey)) {
    return `timer_${baseKey}`;
  }

  return baseKey;
}

function createUniqueMeasurementKey(
  name: string,
  usedKeys: Set<string>,
): string {
  const baseKey = sanitizeMeasurementKey(name).slice(
    0,
    MAX_MEASUREMENT_KEY_LENGTH,
  );
  if (!usedKeys.has(baseKey)) {
    usedKeys.add(baseKey);
    return baseKey;
  }

  let suffix = 2;
  while (true) {
    const suffixToken = `_${suffix}`;
    const maxBaseLength = Math.max(
      1,
      MAX_MEASUREMENT_KEY_LENGTH - suffixToken.length,
    );
    const collisionKey = `${baseKey.slice(0, maxBaseLength)}${suffixToken}`;

    if (!usedKeys.has(collisionKey)) {
      usedKeys.add(collisionKey);
      return collisionKey;
    }

    suffix += 1;
  }
}

function parseSentryDsn(dsn: string): ParsedSentryDsn | null {
  try {
    const parsedUrl = new URL(dsn);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const projectId = pathSegments[pathSegments.length - 1];
    const publicKey = parsedUrl.username;

    if (!projectId || !publicKey) {
      return null;
    }

    const pathPrefixSegments = pathSegments.slice(0, -1);
    const pathPrefix =
      pathPrefixSegments.length > 0 ? `/${pathPrefixSegments.join('/')}` : '';
    const endpointUrl = new URL(
      `${pathPrefix}/api/${projectId}/envelope/`,
      `${parsedUrl.protocol}//${parsedUrl.host}`,
    );
    endpointUrl.searchParams.set('sentry_key', publicKey);
    endpointUrl.searchParams.set('sentry_version', '7');

    return {
      dsn,
      projectId,
      publicKey,
      endpoint: endpointUrl.toString(),
    };
  } catch {
    return null;
  }
}

function parseSampleRate(rawSampleRate: string | undefined): number | null {
  if (!rawSampleRate) {
    return DEFAULT_SAMPLE_RATE;
  }

  const sampleRate = Number(rawSampleRate);
  if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1) {
    return null;
  }

  return sampleRate;
}

function getGithubJobUrl(): string | null {
  const serverUrl = getEnvValue(ENV_GITHUB_SERVER_URL);
  const repository = getEnvValue(ENV_GITHUB_REPOSITORY);
  const runId = getEnvValue(ENV_GITHUB_RUN_ID);
  if (!serverUrl || !repository || !runId) {
    return null;
  }

  return `${serverUrl}/${repository}/actions/runs/${runId}`;
}

export async function publishPerformanceScenarioToSentry(
  options: PublishPerformanceScenarioOptions,
): Promise<boolean> {
  if (options.metrics.steps.length === 0) {
    return false;
  }

  if (getEnvValue(ENV_SENTRY_ENABLED) === 'false') {
    return false;
  }

  const dsn = getEnvValue(ENV_SENTRY_DSN);
  if (!dsn) {
    return false;
  }

  const parsedDsn = parseSentryDsn(dsn);
  if (!parsedDsn) {
    logger.warn('Invalid E2E_PERFORMANCE_SENTRY_DSN. Skipping upload.');
    return false;
  }

  const sampleRate = parseSampleRate(getEnvValue(ENV_SENTRY_SAMPLE_RATE));
  if (sampleRate === null) {
    logger.warn(
      'Invalid E2E_PERFORMANCE_SENTRY_SAMPLE_RATE. Expected value between 0 and 1.',
    );
    return false;
  }

  if (sampleRate < 1 && Math.random() > sampleRate) {
    return false;
  }

  const eventId = createHexId(32);
  const traceId = createHexId(32);
  const transactionSpanId = createHexId(16);

  const totalDurationMs = Math.round(options.metrics.total * 1000);
  const endTimestamp = Date.now() / 1000;
  const startTimestamp = endTimestamp - totalDurationMs / 1000;

  const usedMeasurementKeys = new Set<string>(RESERVED_MEASUREMENT_KEYS);
  const timerMeasurements: TimerMeasurement[] = options.metrics.steps.map(
    (step) => ({
      key: createUniqueMeasurementKey(step.name, usedMeasurementKeys),
      name: step.name,
      duration: step.duration,
      threshold: step.threshold ?? null,
      baseThreshold: step.baseThreshold ?? null,
      passed: step.validation?.passed ?? null,
      exceeded: step.validation?.exceeded ?? null,
      percentOver: step.validation?.percentOver ?? null,
    }),
  );

  const measurements: Record<string, SentryMeasurement> = {
    scenario_total_time_ms: {
      value: totalDurationMs,
      unit: 'millisecond',
    },
  };

  for (const timerMeasurement of timerMeasurements) {
    measurements[timerMeasurement.key] = {
      value: timerMeasurement.duration,
      unit: 'millisecond',
    };
  }

  if (options.metrics.totalThreshold !== null) {
    measurements.scenario_total_threshold_ms = {
      value: options.metrics.totalThreshold,
      unit: 'millisecond',
    };
  }

  const provider = options.metrics.device.provider || 'unknown';
  const teamId = options.metrics.team?.teamId || 'unknown';
  const teamName = options.metrics.team?.teamName || 'unknown';
  const testStatus = options.status || 'unknown';
  const retry = options.retry ?? 0;
  const workerIndex = options.workerIndex ?? 0;
  const buildVariant = normalizeBuildVariant(
    getEnvValue(ENV_SENTRY_BUILD_VARIANT),
  );
  const testFilePath = options.testFilePath || '';

  const mirroredScenarioAttributes: MirroredScenarioAttributes = {
    project_name: options.projectName,
    test_team: teamId,
    provider,
    team_id: teamId,
    team_name: teamName,
    test_status: testStatus,
    retry,
    worker_index: workerIndex,
    build_variant: buildVariant,
    device_name: options.metrics.device.name,
    device_os_version: options.metrics.device.osVersion,
    test_file_path: testFilePath,
    recording_url: options.browserstackRecordingUrl ?? null,
    github_job_url: getGithubJobUrl(),
    github_job_name: getEnvValue(ENV_GITHUB_JOB) ?? null,
  };

  let cursor = startTimestamp;
  const spans = timerMeasurements.map((timerMeasurement) => {
    const spanStart = cursor;
    const spanEnd = spanStart + timerMeasurement.duration / 1000;
    cursor = spanEnd;

    return {
      trace_id: traceId,
      span_id: createHexId(16),
      parent_span_id: transactionSpanId,
      op: 'e2e.performance.step',
      description: timerMeasurement.name,
      start_timestamp: spanStart,
      timestamp: spanEnd,
      status: timerMeasurement.passed === false ? 'deadline_exceeded' : 'ok',
      data: {
        duration_ms: timerMeasurement.duration,
        threshold_ms: timerMeasurement.threshold,
        base_threshold_ms: timerMeasurement.baseThreshold,
        exceeded_ms: timerMeasurement.exceeded,
        percent_over: timerMeasurement.percentOver,
        ...mirroredScenarioAttributes,
      },
    };
  });

  const environment =
    getEnvValue(ENV_SENTRY_ENVIRONMENT) || DEFAULT_ENVIRONMENT;
  const release = getEnvValue(ENV_SENTRY_RELEASE);

  const payload = {
    event_id: eventId,
    type: 'transaction',
    platform: 'javascript',
    transaction: options.testTitle,
    transaction_info: {
      source: 'custom',
    },
    start_timestamp: startTimestamp,
    timestamp: endTimestamp,
    environment,
    ...(release ? { release } : {}),
    contexts: {
      trace: {
        trace_id: traceId,
        span_id: transactionSpanId,
        op: 'e2e.performance.scenario',
        status: normalizeSpanStatus(options.status),
      },
      device: {
        name: options.metrics.device.name,
        os_version: options.metrics.device.osVersion,
      },
    },
    tags: {
      source: 'appwright-e2e-performance',
      project_name: mirroredScenarioAttributes.project_name,
      provider: mirroredScenarioAttributes.provider,
      team_id: mirroredScenarioAttributes.team_id,
      team_name: mirroredScenarioAttributes.team_name,
      test_team: mirroredScenarioAttributes.test_team,
      test_status: mirroredScenarioAttributes.test_status,
      retry: String(mirroredScenarioAttributes.retry),
      worker_index: String(mirroredScenarioAttributes.worker_index),
      build_variant: mirroredScenarioAttributes.build_variant,
    },
    measurements,
    spans,
    extra: {
      test_file_path: mirroredScenarioAttributes.test_file_path,
      recording_url: mirroredScenarioAttributes.recording_url,
      github_job_url: mirroredScenarioAttributes.github_job_url,
      github_job_name: mirroredScenarioAttributes.github_job_name,
      test_tags: options.tags,
      threshold_margin_percent: options.metrics.thresholdMarginPercent,
      has_thresholds: options.metrics.hasThresholds,
      total_seconds: options.metrics.total,
      total_threshold_ms: options.metrics.totalThreshold,
      total_validation: options.metrics.totalValidation,
      timer_steps: timerMeasurements,
      sentry_project_id: parsedDsn.projectId,
    },
  };

  const envelopeHeaders = {
    event_id: eventId,
    dsn: parsedDsn.dsn,
    sent_at: new Date().toISOString(),
  };
  const itemHeaders = {
    type: 'transaction',
  };

  const envelope = `${JSON.stringify(envelopeHeaders)}\n${JSON.stringify(itemHeaders)}\n${JSON.stringify(payload)}`;

  try {
    const response = await fetch(parsedDsn.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'User-Agent': 'metamask-mobile-appwright-performance',
      },
      body: envelope,
    });

    if (!response.ok) {
      logger.warn(
        `Failed to upload scenario "${options.testTitle}" to Sentry. Status: ${response.status}`,
      );
      return false;
    }

    logger.info(
      `Uploaded scenario "${options.testTitle}" with ${timerMeasurements.length} timer measurements to Sentry.`,
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Error uploading scenario "${options.testTitle}" to Sentry: ${message}`,
    );
    return false;
  }
}
