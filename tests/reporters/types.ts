/**
 * Shared TypeScript types for the performance reporter system.
 */

// Re-export QualityGatesResult from the canonical quality-gates module so
// consumers can import it from here alongside the other reporter types.
import type { QualityGatesResult } from '../framework/quality-gates';
export type { QualityGatesResult };

export interface MetricStep {
  name: string;
  duration: number;
  baseThreshold: number | null;
  threshold: number | null;
  /** Wall-clock epoch ms when the timer started (test-runner clock). */
  startedAt?: number;
  /** Wall-clock epoch ms when the timer stopped (test-runner clock). */
  endedAt?: number;
  validation?: {
    passed: boolean;
    exceeded: number | null;
    percentOver: string | null;
  } | null;
}

/** A named time window (epoch ms, runner clock) used to attribute API calls. */
export interface NetworkWindow {
  name: string;
  startedAt: number;
  endedAt: number;
}

export interface DeviceInfo {
  name: string;
  osVersion: string;
  provider?: string;
}

export interface TeamInfo {
  teamId: string;
  teamName: string;
  slackId?: string;
  slackMention?: string;
}

export interface MetricsEntry {
  testName: string;
  /** Playwright project name; disambiguates the same title across projects. */
  projectName?: string;
  testFilePath?: string;
  tags?: string[];
  steps: MetricStep[];
  /** Network-only timer windows (see `TimerHelper` `networkOnly`). */
  networkWindows?: NetworkWindow[];
  /** Phase windows (login, test_body, ...) from `appium-phase-timings`. */
  phaseWindows?: NetworkWindow[];
  total: number;
  totalThreshold?: number | null;
  hasThresholds?: boolean;
  totalValidation?: {
    passed: boolean;
    exceeded: number | null;
    percentOver: string | null;
  } | null;
  device: DeviceInfo;
  team?: TeamInfo;
  testFailed?: boolean;
  failureReason?: string | null;
  failureMessage?: string | null;
  note?: string;
  thresholdMarginPercent?: number;
  timestamp?: string;
  message?: string;
  testDuration?: number;
  /** Epoch ms the Playwright attempt started (test-runner clock). */
  testStartedAt?: number;
  /** Epoch ms the Playwright attempt ended, teardown included. */
  testEndedAt?: number;
  qualityGates?: QualityGatesResult | null;
  videoURL?: string | null;
  sessionId?: string | null;
  sessionCreationDurationMs?: number;
  profilingData?: ProfilingData | null;
  profilingSummary?: ProfilingSummary | null;
  apiCalls?: NetworkLogEntry[] | null;
  apiCallsError?: string | null;
  retryInfo?: RetryInfo;
}

/** Set when a test only passed after one or more failed attempts. */
export interface RetryInfo {
  /** Attempt number (1-based) that finally passed. */
  attempts: number;
  /** Why the first attempt failed, e.g. `session_creation_failed`. */
  firstFailureReason: string | null;
  firstFailureMessage?: string | null;
  firstFailureDurationSec: number | null;
}

export interface SessionData {
  sessionId: string;
  testTitle: string;
  testFilePath?: string;
  testStatus?: string;
  testDuration?: number;
  projectName?: string;
  timestamp?: string;
  team?: TeamInfo;
  tags?: string[];
  videoURL?: string;
  profilingData?: ProfilingData | null;
  profilingSummary?: ProfilingSummary | null;
  networkLogsEntries?: NetworkLogEntry[];
  networkLogsError?: string;
  deviceInfo?: DeviceInfo;
}

export interface ProfilingData {
  data?: {
    'io.metamask'?: {
      status?: string;
      detected_issues?: ProfilingIssue[];
      metrics: {
        app_size?: number;
        cpu?: { avg?: number; max?: number };
        mem?: { avg?: number; max?: number };
        batt?: { total_batt_usage?: number; total_batt_usage_pct?: number };
        diskio?: { total_reads?: number; total_writes?: number };
        networkio?: { total_upload?: number; total_download?: number };
        ui_rendering?: {
          slow_frames_pct?: number;
          frozen_frames_pct?: number;
          num_anrs?: number;
        };
      };
    };
    units?: {
      cpu?: string;
      mem?: string;
      batt?: string;
      diskio?: string;
      networkio?: string;
    };
  };
  error?: string;
  timestamp?: string;
}

export interface ProfilingSummary {
  status?: string;
  issues?: number;
  criticalIssues?: number;
  appSizeMb?: number;
  cpu?: { avg: number; max: number; unit?: string };
  memory?: { avg: number; max: number; unit?: string };
  battery?: { total: number; percentage: number; unit?: string };
  diskIO?: { reads: number; writes: number; unit?: string };
  networkIO?: { upload: number; download: number; unit?: string };
  uiRendering?: { slowFrames: number; frozenFrames: number; anrs: number };
  /** Average frames per second over the session (TestMu). */
  fps?: { avg: number };
  /** App launch times in milliseconds (TestMu). */
  startup?: { cold?: number; hot?: number; unit?: string };
  /** Battery drained by the session in mAh (TestMu, Android). */
  batteryDrain?: { total: number; unit?: string };
  /** Battery temperature in degrees Celsius (TestMu, Android). */
  temperature?: { avg: number; max: number; unit?: string };
  crashes?: number;
  error?: string;
  timestamp?: string;
}

export interface ProfilingIssue {
  type?: string;
  title?: string;
  subtitle?: string;
  current?: string | number;
  recommended?: string | number;
  unit?: string;
  link?: string;
}

export interface NetworkLogEntry {
  method: string;
  url: string;
  status?: number;
  time?: number;
  /** Request start, epoch ms (HAR `startedDateTime`, TestMu clock). */
  startedAt?: number;
}

/**
 * What produced a request, so test and telemetry noise can be filtered out:
 * `app` (default), `preflight` (CORS OPTIONS), `test_infra` (local mock
 * server, health checks) or `telemetry` (obvious Sentry/Google beacons).
 */
export type ApiKind = 'app' | 'preflight' | 'test_infra' | 'telemetry';

export interface ApiEndpointSummary {
  method: string;
  kind: ApiKind;
  /** Sanitized `host/path` (no protocol, query or key-like segments). */
  url: string;
  count: number;
  failed: number;
}

/**
 * Request-count summary for one scenario, derived from the captured network
 * log. `captured` carries the counts; `error` means capture was attempted but
 * failed, so no count is available (distinct from a captured count of 0).
 */
export type ApiCallsSummary =
  | {
      status: 'captured';
      total: number;
      /** Distinct method + sanitized URL pairs. */
      unique: number;
      /** `total - unique`: repeated calls to an already-seen endpoint. */
      duplicates: number;
      /** Requests with status >= 400, or a missing / zero status. */
      failed: number;
      byHost: Record<string, number>;
      /** Same counts as above, restricted to `api.kind: app` requests. */
      app: ApiCountSummary;
      topEndpoints: ApiEndpointSummary[];
      /** Per measured step; present only when step windows were provided. */
      steps?: ApiStepSummary[];
      stepAttribution?: ApiStepAttribution;
    }
  | { status: 'error'; error: string };

export type ApiStepSource = 'timed' | 'network_only' | 'phase';

export interface ApiCountSummary {
  total: number;
  unique: number;
  duplicates: number;
  failed: number;
}

/**
 * Request counts for one measured step (or `unattributed`). `during` also
 * covers the short pre-roll before the timer started; `after` holds calls
 * shortly after the timer stopped, kept apart so `during` stays clean;
 * `none` is the `unattributed` bucket.
 */
export interface ApiStepSummary {
  step: string;
  /** `timed`: a measured step; `network_only`: window-only timer; `phase`: harness phase. */
  source: ApiStepSource | 'none';
  phase: 'during' | 'after' | 'none';
  total: number;
  /** Requests with `api.kind: app`. */
  appTotal: number;
  failed: number;
  topEndpoints: ApiEndpointSummary[];
}

export interface ApiStepAttribution {
  /**
   * `ok`: usable. `skewed`: many calls fall outside the real test window, so
   * HAR and test-runner clocks probably disagree. `no_overlap`: no call
   * landed in a step and the HAR timespan does not intersect the steps'.
   * `unavailable`: no step windows or no request timestamps.
   */
  status: 'ok' | 'skewed' | 'no_overlap' | 'unavailable';
  attributed: number;
  unattributed: number;
  /** Calls starting outside the test window (+ tolerance). */
  outsideTestWindow: number;
  /** Calls without a start timestamp (always unattributed). */
  missingTimestamp: number;
  reason?: string;
}

/**
 * Per-scenario artifact written under `reports/app-profiling/`.
 * One file per performance scenario: profiling data + API calls.
 */
export interface AppProfilingArtifact {
  testName: string;
  projectName: string | null;
  sessionId: string | null;
  /** BrowserStack session recording URL when enrichment succeeded. */
  videoURL: string | null;
  device: DeviceInfo;
  timestamp: string;
  profilingSummary: ProfilingSummary | null;
  profilingData: ProfilingData | null;
  apiCalls: NetworkLogEntry[] | null;
  apiCallsError: string | null;
  /** `null` when no network capture was attempted for the scenario. */
  apiCallsSummary: ApiCallsSummary | null;
}

export interface FailedTestEntry {
  testName: string;
  testFilePath: string;
  tags: string[];
  status: string;
  duration: number;
  projectName: string;
  sessionId: string | null;
  qualityGates: QualityGatesResult | null;
  failureReason: string | null;
  /** First line of the Playwright error, e.g. which element was not found. */
  failureMessage?: string | null;
  qualityGatesViolations?: {
    stepName: string;
    actual: number;
    threshold: number;
    exceeded: number;
  }[];
}

export interface FailedTestsByTeam {
  [teamId: string]: {
    team: TeamInfo;
    tests: FailedTestEntry[];
  };
}

export interface ReportData {
  metrics: MetricsEntry[];
  sessions: SessionData[];
  failedTestsByTeam: FailedTestsByTeam;
  summary: ReportSummary;
}

export interface ReportSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testsWithSteps: number;
  testsWithFallbackData: number;
}
