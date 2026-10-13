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

  describe('app metrics', () => {
    it('summarises time series into avg/max for cpu, memory and network', async () => {
      getApiMock().getAppMetrics.mockResolvedValue({
        appCpu: [{ value: 10 }, { value: 30 }],
        appMemory: [{ value: 100 }, { value: 300 }],
        download: [{ value: 1 }, { value: 4 }],
        upload: [{ value: 2 }, { value: 3 }],
      });
      const session = makeSession();

      await enricher.enrichSession(session);

      expect(session.videoURL).toBe('https://video');
      expect(session.profilingSummary).toMatchObject({
        status: 'available',
        cpu: { avg: 20, max: 30, unit: '%' },
        memory: { avg: 200, max: 300, unit: 'MB' },
        networkIO: { upload: 3, download: 4, unit: 'MB' },
      });
    });

    it('ignores timestamp fields when samples are objects without a value key', async () => {
      getApiMock().getAppMetrics.mockResolvedValue({
        appCpu: [
          { timestamp: 1700000000, cpu: 5 },
          { timestamp: 1700000001, cpu: 15 },
        ],
      });
      const session = makeSession();

      await enricher.enrichSession(session);

      expect(session.profilingSummary?.cpu).toEqual({
        avg: 10,
        max: 15,
        unit: '%',
      });
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
