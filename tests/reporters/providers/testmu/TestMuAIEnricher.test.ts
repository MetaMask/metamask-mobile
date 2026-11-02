jest.mock(
  '../../../framework/services/providers/testmu/TestMuAIAPI.ts',
  () => ({
    TestMuAIAPI: jest.fn().mockImplementation(() => ({
      getVideoURL: jest.fn(),
      getAppMetrics: jest.fn(),
      getNetworkLogs: jest.fn(),
    })),
    TestMuAIAPIError: class extends Error {
      status: number;
      body: string | null;
      constructor(message: string, status: number, body: string | null = null) {
        super(message);
        this.status = status;
        this.body = body;
      }
    },
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

import { TestMuAIEnricher } from './TestMuAIEnricher';
import {
  TestMuAIAPI,
  TestMuAIAPIError,
} from '../../../framework/services/providers/testmu/TestMuAIAPI';
import type { SessionData } from '../../types';

const makeSession = (): SessionData => ({
  sessionId: 'sess-1',
  testTitle: 'Swap flow',
});

const getApiMock = (): {
  getVideoURL: jest.Mock;
  getAppMetrics: jest.Mock;
  getNetworkLogs: jest.Mock;
} => (TestMuAIAPI as unknown as jest.Mock).mock.results[0].value;

describe('TestMuAIEnricher', () => {
  let enricher: TestMuAIEnricher;

  beforeEach(() => {
    jest.clearAllMocks();
    Reflect.deleteProperty(process.env, 'TESTMU_NETWORK_LOGS');
    enricher = new TestMuAIEnricher();
    getApiMock().getVideoURL.mockResolvedValue('https://video');
  });

  describe('canHandle', () => {
    it.each([
      'testmu-android',
      'testmu-android-onboarding-seedless',
      'TestMu-iOS',
    ])('accepts the TestMu project %s', (projectName) => {
      const result = enricher.canHandle(projectName);

      expect(result).toBe(true);
    });

    it.each(['browserstack-android', 'android-onboarding'])(
      'rejects the non-TestMu project %s',
      (projectName) => {
        const result = enricher.canHandle(projectName);

        expect(result).toBe(false);
      },
    );
  });

  describe('app metrics', () => {
    it('maps the meta aggregates and series of the real appmetrics payload', async () => {
      getApiMock().getAppMetrics.mockResolvedValue({
        cpu: [{ app: 10, sys: 20, time: 0 }],
        mem: [{ app: 100, sys: 9000, time: 0 }],
        network: [{ appIn: 1, appOut: 2, time: 0 }],
        frames: [
          { janky: 5, frozen: 1, time: 0 },
          { janky: 7, frozen: 0, time: 1 },
        ],
        battery: [
          { sys: 0, time: 0 },
          { sys: 7.68, time: 1 },
        ],
        temperature: [
          { temp: 23, time: 0 },
          { temp: 25, time: 1 },
        ],
        meta: {
          avgFrameRate: 103.92,
          coldStartup: 460,
          hotStartup: 65,
          crashCount: 0,
          avgCpu: 14.19,
          maxCPUUtilization: 32.89,
          avgMemory: 649.66,
          maxMemoryUsage: 786.84,
          networkDownload: 5166707,
          networkUpload: 604812,
          anrCount: 2,
        },
      });
      const session = makeSession();

      await enricher.enrichSession(session);

      expect(session.videoURL).toBe('https://video');
      expect(session.profilingSummary).toMatchObject({
        status: 'available',
        cpu: { avg: 14.19, max: 32.89, unit: '%' },
        memory: { avg: 649.66, max: 786.84, unit: 'MB' },
        networkIO: { upload: 591, download: 5046, unit: 'KB' },
        uiRendering: { slowFrames: 12, frozenFrames: 1, anrs: 2 },
        fps: { avg: 103.92 },
        startup: { cold: 460, hot: 65, unit: 'ms' },
        batteryDrain: { total: 7.68, unit: 'mAh' },
        temperature: { avg: 24, max: 25, unit: '°C' },
        crashes: 0,
      });
    });

    it('falls back to the series when meta is missing', async () => {
      getApiMock().getAppMetrics.mockResolvedValue({
        cpu: [
          { app: 10, time: 0 },
          { app: 30, time: 1 },
        ],
        mem: [
          { app: 100, time: 0 },
          { app: 300, time: 1 },
        ],
      });
      const session = makeSession();

      await enricher.enrichSession(session);

      expect(session.profilingSummary).toMatchObject({
        cpu: { avg: 20, max: 30, unit: '%' },
        memory: { avg: 200, max: 300, unit: 'MB' },
      });
      expect(session.profilingSummary?.networkIO).toBeUndefined();
      expect(session.profilingSummary?.uiRendering).toBeUndefined();
      expect(session.profilingSummary?.fps).toBeUndefined();
      expect(session.profilingSummary?.startup).toBeUndefined();
      expect(session.profilingSummary?.batteryDrain).toBeUndefined();
    });

    it('reports an error listing the keys when the shape is not recognised', async () => {
      getApiMock().getAppMetrics.mockResolvedValue({ foo: [], bar: {} });
      const session = makeSession();

      await enricher.enrichSession(session);

      expect(session.profilingSummary?.error).toContain('foo, bar');
      expect(session.profilingSummary?.cpu).toBeUndefined();
    });

    it('records HTTP status and body when the request fails', async () => {
      getApiMock().getAppMetrics.mockRejectedValue(
        new TestMuAIAPIError('Not Found', 404, '{"message":"no metrics"}'),
      );
      const session = makeSession();

      await enricher.enrichSession(session);

      expect(session.profilingSummary?.error).toContain('HTTP 404');
      expect(session.profilingSummary?.error).toContain('no metrics');
    });
  });

  describe('network logs', () => {
    beforeEach(() => {
      getApiMock().getAppMetrics.mockResolvedValue(null);
    });

    it('does not request network logs unless TESTMU_NETWORK_LOGS is true', async () => {
      const session = makeSession();

      await enricher.enrichSession(session);

      expect(getApiMock().getNetworkLogs).not.toHaveBeenCalled();
      expect(session.networkLogsEntries).toBeUndefined();
    });

    it('parses network logs into entries when enabled', async () => {
      process.env.TESTMU_NETWORK_LOGS = 'true';
      getApiMock().getNetworkLogs.mockResolvedValue([
        {
          request: { method: 'GET', url: 'https://api.example.com/x' },
          response: { status: 200 },
          time: 42,
        },
      ]);
      const session = makeSession();

      await enricher.enrichSession(session);

      expect(session.networkLogsEntries).toEqual([
        {
          method: 'GET',
          url: 'https://api.example.com/x',
          status: 200,
          time: 42,
        },
      ]);
    });

    it('stores the error and an empty list when the request fails', async () => {
      process.env.TESTMU_NETWORK_LOGS = 'true';
      getApiMock().getNetworkLogs.mockRejectedValue(
        new TestMuAIAPIError('Not Found', 404, 'nope'),
      );
      const session = makeSession();

      await enricher.enrichSession(session);

      expect(session.networkLogsEntries).toEqual([]);
      expect(session.networkLogsError).toBe('Not Found');
    });
  });
});
