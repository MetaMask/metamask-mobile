import { BaseSessionDataEnricher } from '../SessionDataEnricher';
import {
  TestMuAIAPI,
  TestMuAIAPIError,
} from '../../../framework/services/providers/testmu/TestMuAIAPI';
import { parseHarToEntries } from '../parseHar';
import type { SessionData, ProfilingData, ProfilingSummary } from '../../types';

const TIMESTAMP_KEY = /time|date|^ts$|_at$/i;

// Samples are numbers or objects; for objects prefer `value`, else the first
// numeric field that is not a timestamp.
const sampleValue = (sample: unknown): number | null => {
  if (typeof sample === 'number')
    return Number.isFinite(sample) ? sample : null;
  if (typeof sample === 'string') {
    const parsed = Number(sample);
    return sample.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
  }
  if (sample === null || typeof sample !== 'object') return null;
  const record = sample as Record<string, unknown>;
  if ('value' in record) return sampleValue(record.value);
  for (const [key, value] of Object.entries(record)) {
    if (!TIMESTAMP_KEY.test(key) && typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
  }
  return null;
};

const seriesStats = (series: unknown): { avg: number; max: number } | null => {
  if (!Array.isArray(series)) return null;
  const values = series.map(sampleValue).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return {
    avg: Math.round((sum / values.length) * 100) / 100,
    max: Math.max(...values),
  };
};

/**
 * TestMu AI session enricher — fetches the video URL and app profiling metrics.
 */
export class TestMuAIEnricher extends BaseSessionDataEnricher {
  private api: TestMuAIAPI;

  constructor() {
    super('TestMuAI');
    this.api = new TestMuAIAPI();
  }

  getProviderName(): string {
    return 'testmu';
  }

  canHandle(projectName: string): boolean {
    return projectName.toLowerCase().includes('testmu');
  }

  async enrichSession(session: SessionData): Promise<void> {
    const { sessionId, testTitle } = session;

    try {
      const videoURL = await this.api.getVideoURL(sessionId, 60, 3000);
      if (videoURL) {
        session.videoURL = videoURL;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to fetch TestMu AI video URL for ${testTitle}: ${message}`,
      );
    }

    try {
      this.logger.info(`Fetching TestMu AI app metrics for ${testTitle}...`);
      const rawMetrics = await this.api.getAppMetrics(sessionId);

      if (rawMetrics) {
        this.logger.info(
          `TestMu AI app metrics payload for ${testTitle}: ${JSON.stringify(rawMetrics).slice(0, 800)}`,
        );
        session.profilingData = rawMetrics as ProfilingData;
        session.profilingSummary = this.extractProfilingSummary(
          rawMetrics as Record<string, unknown>,
        );
      } else {
        const errorPayload = {
          error: 'No app metrics returned',
          timestamp: new Date().toISOString(),
        };
        session.profilingData = errorPayload as ProfilingData;
        session.profilingSummary = errorPayload as unknown as ProfilingSummary;
      }
    } catch (error) {
      const baseMessage =
        error instanceof Error ? error.message : String(error);
      const body = error instanceof TestMuAIAPIError ? error.body : null;
      const status = error instanceof TestMuAIAPIError ? error.status : null;
      const message = `${baseMessage}${status ? ` (HTTP ${status})` : ''}${body ? ` — ${body.slice(0, 300)}` : ''}`;
      this.logger.warn(
        `Failed to fetch TestMu AI app metrics for ${testTitle}: ${message}`,
      );
      const errorPayload = {
        error: `Failed to fetch app metrics: ${message}`,
        timestamp: new Date().toISOString(),
      };
      session.profilingData = errorPayload as ProfilingData;
      session.profilingSummary = errorPayload as unknown as ProfilingSummary;
    }

    // Copy process.env first so Babel's env inlining does not bake the value in.
    const runtimeEnv = process.env;
    if (runtimeEnv.TESTMU_NETWORK_LOGS === 'true') {
      await this.enrichNetworkLogs(session);
    }
  }

  private async enrichNetworkLogs(session: SessionData): Promise<void> {
    const { sessionId, testTitle } = session;

    try {
      const har = await this.api.getNetworkLogs(sessionId);
      if (!har) {
        session.networkLogsError =
          'No network logs available (missing credentials)';
        session.networkLogsEntries = [];
        return;
      }
      session.networkLogsEntries = parseHarToEntries(har);
      this.logger.info(
        `Network logs fetched for ${testTitle}: ${session.networkLogsEntries.length} request(s)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const body = error instanceof TestMuAIAPIError ? error.body : null;
      session.networkLogsError = message;
      session.networkLogsEntries = [];
      this.logger.warn(
        `Failed to fetch TestMu AI network logs for ${testTitle}: ${message}${body ? ` — ${body.slice(0, 300)}` : ''}`,
      );
    }
  }

  // The appmetrics API returns time series keyed by metric name (appCpu,
  // appMemory, download, upload, ...), not pre-aggregated avg/max.
  private extractProfilingSummary(
    metrics: Record<string, unknown>,
  ): ProfilingSummary {
    try {
      const data = (metrics.data ?? metrics) as Record<string, unknown>;
      const cpu = seriesStats(data.appCpu);
      const memory = seriesStats(data.appMemory);
      const download = seriesStats(data.download);
      const upload = seriesStats(data.upload);

      if (!cpu && !memory) {
        return {
          error: `Unrecognized TestMu AI app metrics shape (keys: ${Object.keys(data).join(', ')})`,
          timestamp: new Date().toISOString(),
        } as ProfilingSummary;
      }

      return {
        status: 'available',
        issues: 0,
        criticalIssues: 0,
        ...(cpu && { cpu: { avg: cpu.avg, max: cpu.max, unit: '%' } }),
        ...(memory && {
          memory: { avg: memory.avg, max: memory.max, unit: 'MB' },
        }),
        ...((download || upload) && {
          networkIO: {
            upload: upload?.max ?? 0,
            download: download?.max ?? 0,
            unit: 'MB',
          },
        }),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        error: `Failed to extract TestMu AI profiling summary: ${message}`,
        timestamp: new Date().toISOString(),
      } as ProfilingSummary;
    }
  }
}
