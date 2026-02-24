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
  validation?: {
    passed: boolean;
    exceeded: number | null;
    percentOver: string | null;
  } | null;
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
  testFilePath?: string;
  tags?: string[];
  steps: MetricStep[];
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
  note?: string;
  thresholdMarginPercent?: number;
  timestamp?: string;
  message?: string;
  testDuration?: number;
  qualityGates?: QualityGatesResult | null;
  videoURL?: string | null;
  sessionId?: string | null;
  profilingData?: ProfilingData | null;
  profilingSummary?: ProfilingSummary | null;
  apiCalls?: NetworkLogEntry[] | null;
  apiCallsError?: string | null;
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
  cpu?: { avg: number; max: number; unit?: string };
  memory?: { avg: number; max: number; unit?: string };
  battery?: { total: number; percentage: number; unit?: string };
  diskIO?: { reads: number; writes: number; unit?: string };
  networkIO?: { upload: number; download: number; unit?: string };
  uiRendering?: { slowFrames: number; frozenFrames: number; anrs: number };
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
