import { BrowserStackAPI } from './BrowserStackAPI';
import {
  isProfilingSummarySuccess,
  type DetectedIssue,
  type FetchProfilingDataResult,
  type ProfilingSummary,
  type RawProfilingData,
} from './types';

/**
 * Handler for BrowserStack app profiling data operations
 */
export class AppProfilingDataHandler {
  /**
   * Extract profiling summary from raw profiling data
   * @param profilingData - Raw profiling data from BrowserStack
   * @returns Processed profiling summary
   */
  extractProfilingSummary(profilingData: RawProfilingData): ProfilingSummary {
    try {
      if (!profilingData?.data?.['io.metamask']) {
        return {
          error: 'No profiling data available',
          timestamp: new Date().toISOString(),
        };
      }

      const appData = profilingData.data['io.metamask'];
      const metrics = appData?.metrics;
      const units = profilingData.data?.units;

      if (!appData || !metrics) {
        return {
          error: 'No metrics available',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: appData.status ?? 'unknown',
        issues: appData.detected_issues?.length ?? 0,
        criticalIssues:
          appData.detected_issues?.filter(
            (issue: DetectedIssue) => issue.type === 'error',
          ).length ?? 0,
        cpu: {
          avg: metrics.cpu?.avg ?? 0,
          max: metrics.cpu?.max ?? 0,
          unit: units?.cpu ?? '%',
        },
        memory: {
          avg: metrics.mem?.avg ?? 0,
          max: metrics.mem?.max ?? 0,
          unit: units?.mem ?? 'MB',
        },
        battery: {
          total: metrics.batt?.total_batt_usage ?? 0,
          percentage: metrics.batt?.total_batt_usage_pct ?? 0,
          unit: units?.batt ?? 'mAh',
        },
        diskIO: {
          reads: metrics.diskio?.total_reads ?? 0,
          writes: metrics.diskio?.total_writes ?? 0,
          unit: units?.diskio ?? 'KB',
        },
        networkIO: {
          upload: metrics.networkio?.total_upload ?? 0,
          download: metrics.networkio?.total_download ?? 0,
          unit: units?.networkio ?? 'KB',
        },
        uiRendering: {
          slowFrames: metrics.ui_rendering?.slow_frames_pct ?? 0,
          frozenFrames: metrics.ui_rendering?.frozen_frames_pct ?? 0,
          anrs: metrics.ui_rendering?.num_anrs ?? 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error extracting profiling summary:', error);
      return {
        error: `Failed to extract profiling summary: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetch complete profiling data for a session (session details + profiling data)
   * @param sessionId - The session ID
   * @returns Complete profiling data including summary
   */
  async fetchCompleteProfilingData(
    sessionId: string,
  ): Promise<FetchProfilingDataResult> {
    try {
      console.log('Fetching profiling data from BrowserStack...');
      const browserStackAPI = new BrowserStackAPI();

      // Get session details first to extract buildId
      const sessionDetails = await browserStackAPI.getSessionDetails(sessionId);

      if (!sessionDetails?.buildId) {
        return {
          error: 'No build ID found in session details',
          sessionDetails: null,
          profilingData: null,
          profilingSummary: null,
        };
      }

      // Fetch profiling data using the buildId
      const profilingData = await browserStackAPI.getAppProfilingData(
        sessionDetails.buildId,
        sessionId,
      );

      let profilingSummary: ProfilingSummary | null = null;
      if (profilingData) {
        // Extract profiling summary for easier reporting
        profilingSummary = this.extractProfilingSummary(profilingData);
        const issuesCount = isProfilingSummarySuccess(profilingSummary)
          ? profilingSummary.issues
          : 0;
        console.log(`Profiling data fetched: ${issuesCount} issues detected`);
      }

      return {
        sessionDetails,
        profilingData,
        profilingSummary,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`Failed to fetch profiling data: ${errorMessage}`);
      return {
        error: `Failed to fetch profiling data: ${errorMessage}`,
        sessionDetails: null,
        profilingData: null,
        profilingSummary: null,
      };
    }
  }
}
