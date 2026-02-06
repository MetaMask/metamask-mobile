import { DataLakeService } from './DataLakeService';
import {
  createMockServiceContext,
  createMockEvmAccount,
  createMockInfrastructure,
  createMockMessenger,
} from '../../__mocks__/serviceMocks';
import type { ServiceContext } from './ServiceContext';
import type { PerpsPlatformDependencies } from '../types';
import type { PerpsControllerMessenger } from '../PerpsController';

jest.mock('uuid', () => ({ v4: () => 'mock-trace-id' }));

global.fetch = jest.fn();
global.setTimeout = jest.fn((fn: () => void) => {
  fn();
  return 0 as unknown as NodeJS.Timeout;
}) as unknown as typeof setTimeout;

describe('DataLakeService', () => {
  let mockContext: ServiceContext;
  let mockDeps: jest.Mocked<PerpsPlatformDependencies>;
  let mockMessenger: jest.Mocked<PerpsControllerMessenger>;
  let dataLakeService: DataLakeService;
  const mockEvmAccount = createMockEvmAccount();
  const mockToken = 'mock-bearer-token';

  beforeEach(() => {
    mockDeps = createMockInfrastructure();
    mockMessenger = createMockMessenger();
    dataLakeService = new DataLakeService(mockDeps, mockMessenger);

    mockContext = createMockServiceContext({
      errorContext: { controller: 'DataLakeService', method: 'test' },
      tracingContext: {
        provider: 'hyperliquid',
        isTestnet: false,
      },
    });

    // Configure messenger to return expected values
    (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
      if (
        action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
      ) {
        return [mockEvmAccount];
      }
      if (action === 'AuthenticationController:getBearerToken') {
        return Promise.resolve(mockToken);
      }
      return undefined;
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('reportOrder', () => {
    it('skips reporting for testnet', async () => {
      const result = await dataLakeService.reportOrder({
        action: 'open',
        symbol: 'BTC',
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
        symbol: 'BTC',
        sl_price: 45000,
        tp_price: 55000,
        isTestnet: false,
        context: mockContext,
      });

      expect(result).toEqual({ success: true });
      expect(mockMessenger.call).toHaveBeenCalledWith(
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
            symbol: 'BTC',
            sl_price: 45000,
            tp_price: 55000,
          }),
        }),
      );
      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps Data Lake Report',
          tags: expect.objectContaining({ action: 'open', symbol: 'BTC' }),
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
        symbol: 'ETH',
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
      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [];
        }
        if (action === 'AuthenticationController:getBearerToken') {
          return Promise.resolve(mockToken);
        }
        return undefined;
      });

      const result = await dataLakeService.reportOrder({
        action: 'open',
        symbol: 'BTC',
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
      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [mockEvmAccount];
        }
        if (action === 'AuthenticationController:getBearerToken') {
          return Promise.resolve(null);
        }
        return undefined;
      });

      const result = await dataLakeService.reportOrder({
        action: 'open',
        symbol: 'BTC',
        isTestnet: false,
        context: mockContext,
      });

      expect(result).toEqual({
        success: false,
        error: 'No account or token available',
      });
      expect(fetch).not.toHaveBeenCalled();
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
        symbol: 'BTC',
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
        symbol: 'BTC',
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
        symbol: 'BTC',
        isTestnet: false,
        context: mockContext,
        retryCount: 0,
      });
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

      jest.clearAllMocks();

      await dataLakeService.reportOrder({
        action: 'open',
        symbol: 'BTC',
        isTestnet: false,
        context: mockContext,
        retryCount: 1,
      });
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);

      jest.clearAllMocks();

      await dataLakeService.reportOrder({
        action: 'open',
        symbol: 'BTC',
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
        symbol: 'BTC',
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
        symbol: 'INVALID',
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
        symbol: 'BTC',
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
        symbol: 'BTC',
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
        symbol: 'BTC',
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
            symbol: 'BTC',
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
        symbol: 'ETH',
        isTestnet: false,
        context: mockContext,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            user_id: mockEvmAccount.address,
            symbol: 'ETH',
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
        symbol: 'BTC',
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
        symbol: 'BTC',
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
        symbol: 'BTC',
        isTestnet: false,
        context: mockContext,
        retryCount: 2,
      });

      expect(mockDeps.tracer.trace).not.toHaveBeenCalled();
    });
  });
});
