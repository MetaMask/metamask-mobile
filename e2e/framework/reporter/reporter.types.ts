import type { TestCase, Suite } from '@playwright/test/reporter';
import type { ProjectConfig } from '../services/common/types';

/**
 * Device information for performance reporting
 */
export interface DeviceInfo {
  name: string;
  osVersion: string;
  provider?: string;
}

/**
 * Get the project configuration from a test case by traversing the suite hierarchy.
 * In Playwright's reporter API, Suite.project() is a method that returns the project config.
 */
export function getProjectFromTest(test: TestCase): ProjectConfig | undefined {
  let suite: Suite | undefined = test.parent;
  while (suite) {
    const project = suite.project();
    if (project) {
      return project as ProjectConfig;
    }
    suite = suite.parent;
  }
  return undefined;
}

/**
 * A single performance step with step name as key and duration in ms as value
 */
export interface PerformanceStep {
  [stepName: string]: number;
}

/**
 * Detected performance issue from BrowserStack profiling
 */
export interface DetectedIssue {
  title?: string;
  subtitle?: string;
  current?: string | number;
  recommended?: string | number;
  unit?: string;
  link?: string;
  type?: string;
}

/**
 * Profiling data from BrowserStack or an error response
 */
export interface ProfilingDataOrError {
  error?: string;
  timestamp?: string;
  data?: {
    'io.metamask'?: {
      detected_issues?: DetectedIssue[];
      status?: string;
      metrics?: Record<string, unknown>;
    };
    units?: Record<string, string>;
  };
}

/**
 * Profiling summary metrics or an error response
 */
export interface ProfilingSummaryOrError {
  error?: string;
  timestamp?: string;
  status?: string;
  issues?: number;
  criticalIssues?: number;
  cpu?: { avg: number; max: number; unit: string };
  memory?: { avg: number; max: number; unit: string };
  battery?: { total: number; percentage: number; unit: string };
  diskIO?: { reads: number; writes: number; unit: string };
  networkIO?: { upload: number; download: number; unit: string };
  uiRendering?: { slowFrames: number; frozenFrames: number; anrs: number };
}

/**
 * Metrics entry for a single test
 */
export interface MetricsEntry {
  testName: string;
  total?: number;
  device?: DeviceInfo;
  steps?: PerformanceStep[] | Record<string, number>;
  videoURL?: string | null;
  sessionId?: string | null;
  profilingData?: ProfilingDataOrError | null;
  profilingSummary?: ProfilingSummaryOrError | null;
  testFailed?: boolean;
  failureReason?: string;
  note?: string;
  message?: string;
  testDuration?: number;
  [key: string]: unknown;
}

/**
 * Session data for a test execution
 */
export interface SessionData {
  sessionId: string;
  testTitle: string;
  testStatus?: string;
  testDuration?: number;
  timestamp?: string;
  projectName?: string;
  deviceInfo?: DeviceInfo;
  videoURL?: string;
  profilingData?: ProfilingDataOrError;
  profilingSummary?: ProfilingSummaryOrError;
}

/**
 * Group of metrics organized by device
 */
export interface DeviceMetricsGroup {
  device: DeviceInfo;
  metrics: MetricsEntry[];
}
