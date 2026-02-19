import { BaseSessionDataEnricher } from '../SessionDataEnricher';
import { BrowserStackAPI } from '../../../framework/services/providers/browserstack/BrowserStackAPI';
import type {
  SessionData,
  ProfilingData,
  ProfilingSummary,
  NetworkLogEntry,
} from '../../types';

/**
 * BrowserStack session enricher — fetches data via BrowserStackAPI and
 * transforms it into the reporter's session model.
 *
 * All HTTP calls are delegated to BrowserStackAPI; this class only
 * orchestrates calls and transforms responses.
 */
export class BrowserStackEnricher extends BaseSessionDataEnricher {
  private api: BrowserStackAPI;

  constructor() {
    super('BrowserStack');
    this.api = new BrowserStackAPI();
  }

  getProviderName(): string {
    return 'browserstack';
  }

  canHandle(projectName: string): boolean {
    return projectName.includes('browserstack-');
  }

  /**
   * Enrich a single session with video URL, profiling data, and network logs.
   */
  async enrichSession(session: SessionData): Promise<void> {
    const { sessionId, testTitle } = session;

    // 1. Fetch video URL (API handles retry logic)
    const videoURL = await this.api.getVideoURL(sessionId, 60, 3000);
    if (videoURL) {
      session.videoURL = videoURL;
    } else {
      // Fallback: build URL from session details
      const details = await this.api.getSessionDetails(sessionId);
      if (details?.buildId) {
        session.videoURL = `https://app-automate.browserstack.com/builds/${details.buildId}/sessions/${sessionId}`;
        this.logger.info(
          `Fallback: built recording URL from session details for ${testTitle}`,
        );
      }
    }

    // 2. Fetch profiling data
    let buildId: string | null = null;
    try {
      this.logger.info(`Fetching profiling data for ${testTitle}...`);
      const details = await this.api.getSessionDetails(sessionId);
      buildId = details?.buildId ?? null;

      if (!buildId) {
        const errorPayload = {
          error: 'No build ID found in session details',
          timestamp: new Date().toISOString(),
        };
        session.profilingData = errorPayload as ProfilingData;
        session.profilingSummary = errorPayload as unknown as ProfilingSummary;
        this.logger.warn('No build ID found in session details');
      } else {
        const rawProfiling = await this.api.getAppProfilingData(
          buildId,
          sessionId,
        );

        if (rawProfiling) {
          session.profilingData = rawProfiling as ProfilingData;
          session.profilingSummary = this.extractProfilingSummary(
            rawProfiling as ProfilingData,
          );
          this.logger.info(
            `Profiling data fetched for ${testTitle}: ${session.profilingSummary?.issues ?? 0} issues detected`,
          );
        } else {
          const errorPayload = {
            error: 'No profiling data returned',
            timestamp: new Date().toISOString(),
          };
          session.profilingData = errorPayload as ProfilingData;
          session.profilingSummary =
            errorPayload as unknown as ProfilingSummary;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to fetch profiling data for ${testTitle}: ${message}`,
      );
      const errorPayload = {
        error: `Failed to fetch profiling data: ${message}`,
        timestamp: new Date().toISOString(),
      };
      session.profilingData = errorPayload as ProfilingData;
      session.profilingSummary = errorPayload as unknown as ProfilingSummary;
    }

    // 3. Fallback: fetch buildId independently if profiling didn't provide it
    if (!buildId) {
      try {
        const details = await this.api.getSessionDetails(sessionId);
        buildId = details?.buildId ?? null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to get session details for ${testTitle}: ${message}`,
        );
      }
    }

    // 4. Fetch network logs
    try {
      if (!buildId) {
        this.logger.info(
          `Skipping network logs for ${testTitle}: no buildId available`,
        );
        session.networkLogsEntries = [];
      } else {
        this.logger.info(
          `Fetching network logs for session ${sessionId} (${testTitle})...`,
        );
        const har = await this.api.getNetworkLogs(buildId, sessionId);
        if (!har) {
          session.networkLogsError =
            'No network logs available (missing credentials)';
          session.networkLogsEntries = [];
          this.logger.info(
            `Network logs unavailable for ${testTitle}: missing credentials`,
          );
        } else {
          session.networkLogsEntries = this.parseHarToEntries(har);
          this.logger.info(
            `Network logs fetched for ${testTitle}: ${session.networkLogsEntries.length} request(s)`,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      session.networkLogsError = message;
      session.networkLogsEntries = [];
      this.logger.info(`Network logs exception for ${testTitle}: ${message}`);
    }
  }

  // --- Data transformation helpers (no API calls) ---

  /**
   * Extract profiling summary from raw profiling data.
   */
  private extractProfilingSummary(
    profilingData: ProfilingData,
  ): ProfilingSummary {
    try {
      if (!profilingData?.data?.['io.metamask']) {
        return { error: 'No profiling data available' } as ProfilingSummary;
      }

      const appData = profilingData.data['io.metamask'];
      const metrics = appData.metrics;

      return {
        status: appData.status ?? 'unknown',
        issues: appData.detected_issues?.length ?? 0,
        criticalIssues:
          appData.detected_issues?.filter((issue) => issue.type === 'error')
            .length ?? 0,
        cpu: {
          avg: metrics.cpu?.avg ?? 0,
          max: metrics.cpu?.max ?? 0,
          unit: profilingData.data.units?.cpu ?? '%',
        },
        memory: {
          avg: metrics.mem?.avg ?? 0,
          max: metrics.mem?.max ?? 0,
          unit: profilingData.data.units?.mem ?? 'MB',
        },
        battery: {
          total: metrics.batt?.total_batt_usage ?? 0,
          percentage: metrics.batt?.total_batt_usage_pct ?? 0,
          unit: profilingData.data.units?.batt ?? 'mAh',
        },
        diskIO: {
          reads: metrics.diskio?.total_reads ?? 0,
          writes: metrics.diskio?.total_writes ?? 0,
          unit: profilingData.data.units?.diskio ?? 'KB',
        },
        networkIO: {
          upload: metrics.networkio?.total_upload ?? 0,
          download: metrics.networkio?.total_download ?? 0,
          unit: profilingData.data.units?.networkio ?? 'KB',
        },
        uiRendering: {
          slowFrames: metrics.ui_rendering?.slow_frames_pct ?? 0,
          frozenFrames: metrics.ui_rendering?.frozen_frames_pct ?? 0,
          anrs: metrics.ui_rendering?.num_anrs ?? 0,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error extracting profiling summary: ${message}`);
      return {
        error: `Failed to extract profiling summary: ${message}`,
        timestamp: new Date().toISOString(),
      } as ProfilingSummary;
    }
  }

  /**
   * Parse HAR response to a simple list of request entries.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseHarToEntries(har: any): NetworkLogEntry[] {
    const entries: NetworkLogEntry[] = [];
    try {
      const log = har?.log ?? har;
      const harEntries = log?.entries ?? [];
      for (const entry of harEntries) {
        const method = entry.request?.method ?? 'GET';
        const url = entry.request?.url ?? '';
        const status = entry.response?.status;
        const time = entry.time != null ? Math.round(entry.time) : undefined;
        entries.push({ method, url, status, time });
      }
    } catch {
      // ignore parse errors
    }
    return entries;
  }
}
