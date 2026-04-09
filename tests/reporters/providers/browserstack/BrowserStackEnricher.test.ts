jest.mock(
  '../../../framework/services/providers/browserstack/BrowserStackAPI.ts',
  () => ({
    BrowserStackAPI: jest.fn().mockImplementation(() => ({
      getVideoURL: jest.fn(),
      getSessionDetails: jest.fn(),
      buildSessionURL: jest.fn(),
      getAppProfilingData: jest.fn(),
      getNetworkLogs: jest.fn(),
    })),
  }),
);

jest.mock('../../../framework/logger.ts', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import { BrowserStackEnricher } from './BrowserStackEnricher';
import { BrowserStackAPI } from '../../../framework/services/providers/browserstack/BrowserStackAPI';
import type { SessionData } from '../../types';

function makeSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    sessionId: 'sess-123',
    testTitle: 'Login Test',
    ...overrides,
  };
}

function getApiMock(): {
  getVideoURL: jest.Mock;
  getSessionDetails: jest.Mock;
  buildSessionURL: jest.Mock;
  getAppProfilingData: jest.Mock;
  getNetworkLogs: jest.Mock;
} {
  return (BrowserStackAPI as unknown as jest.Mock).mock.results[0].value;
}

describe('BrowserStackEnricher', () => {
  let enricher: BrowserStackEnricher;

  beforeEach(() => {
    jest.clearAllMocks();
    enricher = new BrowserStackEnricher();
  });

  describe('canHandle', () => {
    it('returns true for "browserstack-" prefix', () => {
      expect(enricher.canHandle('browserstack-android')).toBe(true);
      expect(enricher.canHandle('browserstack-ios')).toBe(true);
    });

    it('returns false for non-browserstack projects', () => {
      expect(enricher.canHandle('local')).toBe(false);
      expect(enricher.canHandle('android-emulator')).toBe(false);
    });
  });

  describe('getProviderName', () => {
    it('returns "browserstack"', () => {
      expect(enricher.getProviderName()).toBe('browserstack');
    });
  });

  describe('enrichSession - video URL', () => {
    it('sets videoURL from getVideoURL', async () => {
      const api = getApiMock();
      api.getVideoURL.mockResolvedValue('https://video.example.com');
      api.getSessionDetails.mockResolvedValue({ buildId: 'b1' });
      api.getNetworkLogs.mockResolvedValue(null);

      const session = makeSession();
      await enricher.enrichSession(session);

      expect(session.videoURL).toBe('https://video.example.com');
    });

    it('falls back to buildSessionURL when getVideoURL returns null', async () => {
      const api = getApiMock();
      api.getVideoURL.mockResolvedValue(null);
      api.getSessionDetails.mockResolvedValue({ buildId: 'b1' });
      api.buildSessionURL.mockReturnValue('https://fallback.example.com');
      api.getAppProfilingData.mockResolvedValue(null);
      api.getNetworkLogs.mockResolvedValue(null);

      const session = makeSession();
      await enricher.enrichSession(session);

      expect(api.buildSessionURL).toHaveBeenCalledWith('b1', 'sess-123');
      expect(session.videoURL).toBe('https://fallback.example.com');
    });

    it('handles video URL fetch errors gracefully', async () => {
      const api = getApiMock();
      api.getVideoURL.mockRejectedValue(new Error('network error'));
      api.getSessionDetails.mockResolvedValue({ buildId: 'b1' });
      api.getAppProfilingData.mockResolvedValue(null);
      api.getNetworkLogs.mockResolvedValue(null);

      const session = makeSession();
      await enricher.enrichSession(session);

      // Should not throw, session should still be enriched with profiling/network
      expect(session.videoURL).toBeUndefined();
    });
  });

  describe('enrichSession - profiling', () => {
    it('extracts profiling summary from raw data', async () => {
      const api = getApiMock();
      api.getVideoURL.mockResolvedValue('https://video.example.com');
      api.getSessionDetails.mockResolvedValue({ buildId: 'b1' });
      api.getAppProfilingData.mockResolvedValue({
        data: {
          'io.metamask': {
            status: 'ok',
            detected_issues: [],
            metrics: {
              cpu: { avg: 25, max: 80 },
              mem: { avg: 150, max: 300 },
              batt: { total_batt_usage: 50, total_batt_usage_pct: 0.05 },
              diskio: { total_reads: 100, total_writes: 50 },
              networkio: { total_upload: 200, total_download: 500 },
              ui_rendering: {
                slow_frames_pct: 2,
                frozen_frames_pct: 0,
                num_anrs: 0,
              },
            },
          },
          units: { cpu: '%', mem: 'MB' },
        },
      });
      api.getNetworkLogs.mockResolvedValue(null);

      const session = makeSession();
      await enricher.enrichSession(session);

      expect(session.profilingSummary).toMatchObject({
        status: 'ok',
        issues: 0,
        cpu: { avg: 25, max: 80 },
        memory: { avg: 150, max: 300 },
        battery: { total: 50, percentage: 0.05 },
      });
    });

    it('handles missing buildId', async () => {
      const api = getApiMock();
      api.getVideoURL.mockResolvedValue('https://video.example.com');
      api.getSessionDetails.mockResolvedValue(null);
      api.getNetworkLogs.mockResolvedValue(null);

      const session = makeSession();
      await enricher.enrichSession(session);

      expect(session.profilingData).toMatchObject({
        error: expect.stringContaining('No build ID'),
      });
    });

    it('handles null profiling data', async () => {
      const api = getApiMock();
      api.getVideoURL.mockResolvedValue('https://video.example.com');
      api.getSessionDetails.mockResolvedValue({ buildId: 'b1' });
      api.getAppProfilingData.mockResolvedValue(null);
      api.getNetworkLogs.mockResolvedValue(null);

      const session = makeSession();
      await enricher.enrichSession(session);

      expect(session.profilingData).toMatchObject({
        error: 'No profiling data returned',
      });
    });

    it('handles profiling fetch errors', async () => {
      const api = getApiMock();
      api.getVideoURL.mockResolvedValue('https://video.example.com');
      api.getSessionDetails.mockRejectedValue(new Error('api error'));
      api.getNetworkLogs.mockResolvedValue(null);

      const session = makeSession();
      await enricher.enrichSession(session);

      expect(session.profilingData).toMatchObject({
        error: expect.stringContaining('api error'),
      });
    });
  });

  describe('enrichSession - network logs', () => {
    it('parses HAR entries', async () => {
      const api = getApiMock();
      api.getVideoURL.mockResolvedValue('https://video.example.com');
      api.getSessionDetails.mockResolvedValue({ buildId: 'b1' });
      api.getAppProfilingData.mockResolvedValue(null);
      api.getNetworkLogs.mockResolvedValue({
        log: {
          entries: [
            {
              request: { method: 'GET', url: 'https://api.example.com/data' },
              response: { status: 200 },
              time: 150,
            },
            {
              request: {
                method: 'POST',
                url: 'https://api.example.com/submit',
              },
              response: { status: 201 },
              time: 250.6,
            },
          ],
        },
      });

      const session = makeSession();
      await enricher.enrichSession(session);

      expect(session.networkLogsEntries).toHaveLength(2);
      expect(session.networkLogsEntries?.[0]).toEqual({
        method: 'GET',
        url: 'https://api.example.com/data',
        status: 200,
        time: 150,
      });
      expect(session.networkLogsEntries?.[1].time).toBe(251); // rounded
    });

    it('handles missing buildId by setting empty entries', async () => {
      const api = getApiMock();
      api.getVideoURL.mockResolvedValue('https://video.example.com');
      api.getSessionDetails.mockResolvedValue(null);

      const session = makeSession();
      await enricher.enrichSession(session);

      expect(session.networkLogsEntries).toEqual([]);
    });

    it('handles null network logs response', async () => {
      const api = getApiMock();
      api.getVideoURL.mockResolvedValue('https://video.example.com');
      api.getSessionDetails.mockResolvedValue({ buildId: 'b1' });
      api.getAppProfilingData.mockResolvedValue(null);
      api.getNetworkLogs.mockResolvedValue(null);

      const session = makeSession();
      await enricher.enrichSession(session);

      expect(session.networkLogsEntries).toEqual([]);
      expect(session.networkLogsError).toContain('missing credentials');
    });

    it('handles network logs fetch errors', async () => {
      const api = getApiMock();
      api.getVideoURL.mockResolvedValue('https://video.example.com');
      api.getSessionDetails.mockResolvedValue({ buildId: 'b1' });
      api.getAppProfilingData.mockResolvedValue(null);
      api.getNetworkLogs.mockRejectedValue(new Error('network timeout'));

      const session = makeSession();
      await enricher.enrichSession(session);

      expect(session.networkLogsError).toBe('network timeout');
      expect(session.networkLogsEntries).toEqual([]);
    });
  });

  describe('enrichSession - full orchestration', () => {
    it('continues enriching remaining fields when video step fails', async () => {
      const api = getApiMock();
      api.getVideoURL.mockRejectedValue(new Error('video fail'));
      api.getSessionDetails.mockResolvedValue({ buildId: 'b1' });
      api.getAppProfilingData.mockResolvedValue(null);
      api.getNetworkLogs.mockResolvedValue({ log: { entries: [] } });

      const session = makeSession();
      await enricher.enrichSession(session);

      // Profiling and network should still be attempted
      expect(api.getAppProfilingData).toHaveBeenCalled();
      expect(api.getNetworkLogs).toHaveBeenCalled();
      expect(session.networkLogsEntries).toEqual([]);
    });
  });
});
