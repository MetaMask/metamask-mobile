/**
 * BrowserStack profiling and session types
 */

/**
 * CPU metrics from profiling
 */
export interface CpuMetrics {
  avg: number;
  max: number;
  unit: string;
}

/**
 * Memory metrics from profiling
 */
export interface MemoryMetrics {
  avg: number;
  max: number;
  unit: string;
}

/**
 * Battery metrics from profiling
 */
export interface BatteryMetrics {
  total: number;
  percentage: number;
  unit: string;
}

/**
 * Disk I/O metrics from profiling
 */
export interface DiskIOMetrics {
  reads: number;
  writes: number;
  unit: string;
}

/**
 * Network I/O metrics from profiling
 */
export interface NetworkIOMetrics {
  upload: number;
  download: number;
  unit: string;
}

/**
 * UI rendering metrics from profiling
 */
export interface UIRenderingMetrics {
  slowFrames: number;
  frozenFrames: number;
  anrs: number;
}

/**
 * Successful profiling summary with all metrics
 */
export interface ProfilingSummarySuccess {
  status: string;
  issues: number;
  criticalIssues: number;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  battery: BatteryMetrics;
  diskIO: DiskIOMetrics;
  networkIO: NetworkIOMetrics;
  uiRendering: UIRenderingMetrics;
  timestamp: string;
}

/**
 * Error response for profiling summary
 */
export interface ProfilingSummaryError {
  error: string;
  timestamp: string;
}

/**
 * Profiling summary - either success with metrics or error
 */
export type ProfilingSummary = ProfilingSummarySuccess | ProfilingSummaryError;

/**
 * Type guard to check if profiling summary is successful (has metrics)
 */
export function isProfilingSummarySuccess(
  summary: ProfilingSummary | null | undefined,
): summary is ProfilingSummarySuccess {
  return summary !== null && summary !== undefined && 'issues' in summary;
}

/**
 * Type guard to check if profiling summary is an error
 */
export function isProfilingSummaryError(
  summary: ProfilingSummary | null | undefined,
): summary is ProfilingSummaryError {
  return summary !== null && summary !== undefined && 'error' in summary;
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
 * Raw profiling data structure from BrowserStack API
 */
export interface RawProfilingData {
  data?: {
    'io.metamask'?: {
      detected_issues?: DetectedIssue[];
      status?: string;
      metrics?: {
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
}

/**
 * Session details from BrowserStack
 */
export interface SessionDetails {
  buildId: string;
  sessionData: unknown;
  profilingData: unknown;
}

/**
 * Result of fetching complete profiling data
 */
export interface FetchProfilingDataResult {
  error?: string;
  sessionDetails: SessionDetails | null;
  profilingData: RawProfilingData | null;
  profilingSummary: ProfilingSummary | null;
}
