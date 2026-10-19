import { BaseSessionDataEnricher } from '../SessionDataEnricher';
import {
  TestMuAIAPI,
  TestMuAIAPIError,
} from '../../../framework/services/providers/testmu/TestMuAIAPI';
import { parseHarToEntries } from '../parseHar';
import type { SessionData, ProfilingData, ProfilingSummary } from '../../types';

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const statsFromMeta = (
  avg: unknown,
  max: unknown,
): { avg: number; max: number } | null => {
  const avgValue = finiteNumber(avg);
  const maxValue = finiteNumber(max);
  return avgValue !== null && maxValue !== null
    ? { avg: avgValue, max: maxValue }
    : null;
};

const bytesToKb = (bytes: number | null): number =>
  bytes === null ? 0 : Math.round(bytes / 1024);

const sumField = (series: unknown, field: string): number =>
  Array.isArray(series)
    ? series.reduce<number>(
        (total, sample) =>
          total +
          (finiteNumber((sample as Record<string, unknown> | null)?.[field]) ??
            0),
        0,
      )
    : 0;

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

  // appmetrics returns per-interval series (cpu, mem, network, frames, ...)
  // plus a `meta` object with the session aggregates (avgCpu, maxMemoryUsage,
  // networkDownload in bytes, anrCount, ...). Prefer `meta`, fall back to series.
  private extractProfilingSummary(
    metrics: Record<string, unknown>,
  ): ProfilingSummary {
    try {
      const data = (metrics.data ?? metrics) as Record<string, unknown>;
      const meta = (data.meta ?? {}) as Record<string, unknown>;

      const cpu =
        statsFromMeta(meta.avgCpu, meta.maxCPUUtilization) ??
        seriesStats(data.cpu);
      const memory =
        statsFromMeta(meta.avgMemory, meta.maxMemoryUsage) ??
        seriesStats(data.mem);
      const download = finiteNumber(meta.networkDownload);
      const upload = finiteNumber(meta.networkUpload);
      const anrs = finiteNumber(meta.anrCount);
      const fps = finiteNumber(meta.avgFrameRate);
      const coldStartup = finiteNumber(meta.coldStartup);
      const hotStartup = finiteNumber(meta.hotStartup);
      const crashes = finiteNumber(meta.crashCount);
      const batteryDrain = seriesStats(data.battery)?.max ?? null;
      const temperature = seriesStats(data.temperature);

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
        ...((download !== null || upload !== null) && {
          networkIO: {
            upload: bytesToKb(upload),
            download: bytesToKb(download),
            unit: 'KB',
          },
        }),
        ...((Array.isArray(data.frames) || anrs !== null) && {
          uiRendering: {
            slowFrames: sumField(data.frames, 'janky'),
            frozenFrames: sumField(data.frames, 'frozen'),
            anrs: anrs ?? 0,
          },
        }),
        ...(fps !== null && { fps: { avg: fps } }),
        ...((coldStartup !== null || hotStartup !== null) && {
          startup: {
            ...(coldStartup !== null && { cold: coldStartup }),
            ...(hotStartup !== null && { hot: hotStartup }),
            unit: 'ms',
          },
        }),
        ...(batteryDrain !== null && {
          batteryDrain: { total: batteryDrain, unit: 'mAh' },
        }),
        ...(temperature && {
          temperature: { ...temperature, unit: '°C' },
        }),
        ...(crashes !== null && { crashes }),
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
