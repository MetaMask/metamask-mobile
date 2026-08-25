import { BaseSessionDataEnricher } from '../SessionDataEnricher';
import { TestMuAIAPI } from '../../../framework/services/providers/testmu/TestMuAIAPI';
import type { SessionData, ProfilingData, ProfilingSummary } from '../../types';

/**
 * TestMu AI session enricher — fetches video URL and app profiling metrics.
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
      const message = error instanceof Error ? error.message : String(error);
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
  }

  private extractProfilingSummary(
    metrics: Record<string, unknown>,
  ): ProfilingSummary {
    try {
      const data = (metrics.data ?? metrics) as Record<string, unknown>;
      const cpu = (data.cpu ?? data.appCpu) as
        | Record<string, number>
        | undefined;
      const memory = (data.memory ?? data.appMemory) as
        | Record<string, number>
        | undefined;

      return {
        status: 'available',
        issues: 0,
        criticalIssues: 0,
        cpu: {
          avg: cpu?.avg ?? cpu?.average ?? 0,
          max: cpu?.max ?? cpu?.maximum ?? 0,
          unit: '%',
        },
        memory: {
          avg: memory?.avg ?? memory?.average ?? 0,
          max: memory?.max ?? memory?.maximum ?? 0,
          unit: 'MB',
        },
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
