import { DataLakeService } from './DataLakeService';
import {
  createMockServiceContext,
  createMockEvmAccount,
  createMockInfrastructure,
} from '../../__mocks__/serviceMocks';
import type { ServiceContext } from './ServiceContext';
import type { IPerpsPlatformDependencies } from '../types';

jest.mock('uuid', () => ({ v4: () => 'mock-trace-id' }));

global.fetch = jest.fn();
global.setTimeout = jest.fn((fn: () => void) => {
  fn();
  return 0 as unknown as NodeJS.Timeout;
}) as unknown as typeof setTimeout;

describe('DataLakeService', () => {
  let mockContext: ServiceContext;
  let mockDeps: jest.Mocked<IPerpsPlatformDependencies>;
  let dataLakeService: DataLakeService;
  const mockEvmAccount = createMockEvmAccount();
  const mockToken = 'mock-bearer-token';

  beforeEach(() => {
    mockDeps = createMockInfrastructure();
    dataLakeService = new DataLakeService(mockDeps);

    mockContext = createMockServiceContext({
      errorContext: { controller: 'DataLakeService', method: 'test' },
      messenger: {
        call: jest.fn().mockResolvedValue(mockToken),
      } as never,
      tracingContext: {
        provider: 'hyperliquid',
        isTestnet: false,
      },
    });

    (
      mockDeps.controllers.accounts.getSelectedEvmAccount as jest.Mock
    ).mockReturnValue(mockEvmAccount);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('reportOrder', () => {
    it('skips reporting for testnet', async () => {
      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: true,
        context: mockContext,
      });

      expect(result).toEqual({ success: true, error: 'Skipped for testnet' });
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'DataLake API: Skipping for testnet',
        expect.objectContaining({ network: 'testnet' }),
      );
      expect(fetch).not.toHaveBeenCalled();
    });

    it('reports order successfully on first attempt', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue(''),
      });

      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        sl_price: 45000,
        tp_price: 55000,
        isTestnet: false,
        context: mockContext,
      });

      expect(result).toEqual({ success: true });
      expect(mockContext.messenger?.call).toHaveBeenCalledWith(
        'AuthenticationController:getBearerToken',
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
          body: JSON.stringify({
            user_id: mockEvmAccount.address,
            coin: 'BTC',
            sl_price: 45000,
            tp_price: 55000,
          }),
        }),
      );
      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps Data Lake Report',
          tags: expect.objectContaining({ action: 'open', coin: 'BTC' }),
        }),
      );
      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ success: true, retries: 0 }),
        }),
      );
    });

    it('includes performance measurement on success', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue(''),
      });

      await dataLakeService.reportOrder({
        action: 'close',
        coin: 'ETH',
        isTestnet: false,
        context: mockContext,
      });

      expect(mockDeps.tracer.setMeasurement).toHaveBeenCalledWith(
        'perps.api.data_lake_call',
        expect.any(Number),
        'millisecond',
      );
    });

    it('returns error when account is missing', async () => {
      (
        mockDeps.controllers.accounts.getSelectedEvmAccount as jest.Mock
      ).mockReturnValue(null);

      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
      });

      expect(result).toEqual({
        success: false,
        error: 'No account or token available',
      });
      expect(fetch).not.toHaveBeenCalled();
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'DataLake API: Missing requirements',
        expect.objectContaining({ hasAccount: false }),
      );
    });

    it('returns error when token is missing', async () => {
      const contextWithoutToken = {
        ...mockContext,
        messenger: {
          call: jest.fn().mockResolvedValue(null),
        } as never,
      };

      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: contextWithoutToken,
      });

      expect(result).toEqual({
        success: false,
        error: 'No account or token available',
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('returns error when messenger is not available', async () => {
      const contextWithoutMessenger = createMockServiceContext({
        errorContext: { controller: 'DataLakeService', method: 'test' },
        messenger: undefined,
      });

      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: contextWithoutMessenger,
      });

      expect(result).toEqual({
        success: false,
        error: 'Messenger not available in ServiceContext',
      });
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('retries on network error with exponential backoff', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: jest.fn().mockResolvedValue(''),
        });

      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
      });

      expect(result).toEqual({ success: false, error: 'Network error' });
      expect(mockDeps.logger.error).toHaveBeenCalled();
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'DataLake API: Scheduling retry',
        expect.objectContaining({ nextAttempt: 2 }),
      );
      expect(setTimeout).toHaveBeenCalled();
    });

    it('retries up to 3 times then gives up', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Persistent error'));

      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
        retryCount: 3,
      });

      expect(result).toEqual({
        success: false,
        error: 'Persistent error',
      });
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({
              operation: 'finalFailure',
              retryCount: 3,
            }),
          }),
        }),
      );
      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            success: false,
            totalRetries: 3,
          }),
        }),
      );
    });

    it('calculates exponential backoff delays correctly', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
        retryCount: 0,
      });
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

      jest.clearAllMocks();

      await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
        retryCount: 1,
      });
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);

      jest.clearAllMocks();

      await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
        retryCount: 2,
      });
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 4000);
    });

    it('handles API error responses', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });

      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('DataLake API error: 500');
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('handles API 4xx error responses', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request'),
      });

      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'INVALID',
        isTestnet: false,
        context: mockContext,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('DataLake API error: 400');
    });

    it('logs all retry attempts correctly', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
      });

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'DataLake API: Starting order report',
        expect.objectContaining({ attempt: 1, maxAttempts: 4 }),
      );
    });

    it('uses custom trace ID when provided', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue(''),
      });

      await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
        _traceId: 'custom-trace-id',
      });

      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'custom-trace-id' }),
      );
    });

    it('reports close action with TP/SL prices', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue(''),
      });

      await dataLakeService.reportOrder({
        action: 'close',
        coin: 'BTC',
        sl_price: 45000,
        tp_price: 55000,
        isTestnet: false,
        context: mockContext,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            user_id: mockEvmAccount.address,
            coin: 'BTC',
            sl_price: 45000,
            tp_price: 55000,
          }),
        }),
      );
    });

    it('reports order without TP/SL prices when not provided', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue(''),
      });

      await dataLakeService.reportOrder({
        action: 'open',
        coin: 'ETH',
        isTestnet: false,
        context: mockContext,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            user_id: mockEvmAccount.address,
            coin: 'ETH',
            sl_price: undefined,
            tp_price: undefined,
          }),
        }),
      );
    });

    it('handles response with body text', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue('{"orderId": "123"}'),
      });

      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
      });

      expect(result).toEqual({ success: true });
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'DataLake API: Order reported successfully',
        expect.objectContaining({ responseBody: '{"orderId": "123"}' }),
      );
    });

    it('handles empty response body', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue(''),
      });

      const result = await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
      });

      expect(result).toEqual({ success: true });
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'DataLake API: Order reported successfully',
        expect.objectContaining({ responseBody: 'empty' }),
      );
    });

    it('only starts trace on first attempt', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue(''),
      });

      await dataLakeService.reportOrder({
        action: 'open',
        coin: 'BTC',
        isTestnet: false,
        context: mockContext,
        retryCount: 2,
      });

      expect(mockDeps.tracer.trace).not.toHaveBeenCalled();
    });
  });
});
