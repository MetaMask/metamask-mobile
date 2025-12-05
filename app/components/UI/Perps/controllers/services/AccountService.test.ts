import { AccountService } from './AccountService';
import { createMockServiceContext } from '../../__mocks__/serviceMocks';
import { createMockHyperLiquidProvider } from '../../__mocks__/providerMocks';
import Logger from '../../../../../util/Logger';
import { trace, endTrace } from '../../../../../util/trace';
import type { ServiceContext } from './ServiceContext';
import type { IPerpsProvider, WithdrawParams, WithdrawResult } from '../types';
import type { PerpsControllerState } from '../PerpsController';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';

jest.mock('../../../../../util/Logger');
jest.mock('../../../../../util/trace');
jest.mock('uuid', () => ({ v4: () => 'mock-withdrawal-trace-id' }));
jest.mock('react-native-performance', () => ({
  now: jest.fn(() => 1000),
}));
jest.mock('../../../../../core/Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ event: 'mock-event' }),
    })),
  },
}));
jest.mock('../../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    PERPS_WITHDRAWAL_TRANSACTION: 'PERPS_WITHDRAWAL_TRANSACTION',
  },
}));
jest.mock('../../constants/eventNames', () => ({
  PerpsEventProperties: {
    STATUS: 'status',
    WITHDRAWAL_AMOUNT: 'withdrawal_amount',
    COMPLETION_DURATION: 'completion_duration',
    ERROR_MESSAGE: 'error_message',
  },
  PerpsEventValues: {
    STATUS: {
      EXECUTED: 'executed',
      FAILED: 'failed',
    },
  },
}));
jest.mock('../../constants/hyperLiquidConfig', () => ({
  USDC_SYMBOL: 'USDC',
}));
jest.mock('../perpsErrorCodes', () => ({
  PERPS_ERROR_CODES: {
    WITHDRAW_FAILED: 'WITHDRAW_FAILED',
  },
}));
jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));
jest.mock('../../utils/accountUtils', () => ({
  getEvmAccountFromSelectedAccountGroup: jest.fn().mockReturnValue({
    address: '0x1234567890123456789012345678901234567890',
  }),
}));

describe('AccountService', () => {
  let mockProvider: jest.Mocked<IPerpsProvider>;
  let mockContext: ServiceContext;
  let mockRefreshAccountState: jest.Mock;

  const mockWithdrawParams: WithdrawParams = {
    assetId: 'eip155:42161/erc20:0xTokenAddress/default',
    amount: '100',
    destination: '0xDestination',
  };

  beforeEach(() => {
    mockProvider =
      createMockHyperLiquidProvider() as unknown as jest.Mocked<IPerpsProvider>;
    mockContext = createMockServiceContext({
      errorContext: { controller: 'AccountService', method: 'test' },
    });
    mockRefreshAccountState = jest.fn().mockResolvedValue(undefined);

    jest.clearAllMocks();

    // Mock Date.now() to return a stable timestamp
    jest.spyOn(Date, 'now').mockReturnValue(1234567890000);

    // Reinitialize MetricsEventBuilder mock after clearAllMocks
    (MetricsEventBuilder.createEventBuilder as jest.Mock).mockImplementation(
      () => ({
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({ event: 'mock-event' }),
      }),
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('withdraw', () => {
    it('executes successful withdrawal with tx hash', async () => {
      const mockResult: WithdrawResult = {
        success: true,
        txHash: '0xTransactionHash',
        withdrawalId: 'withdrawal-123',
      };
      mockProvider.withdraw.mockResolvedValue(mockResult);

      const result = await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(result).toEqual(mockResult);
      expect(mockProvider.withdraw).toHaveBeenCalledWith(mockWithdrawParams);
    });

    it('starts trace with correct parameters', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: '0xHash',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps Withdraw',
          id: 'mock-withdrawal-trace-id',
          tags: expect.objectContaining({
            assetId: mockWithdrawParams.assetId,
            provider: 'hyperliquid',
            isTestnet: false,
          }),
        }),
      );
    });

    it('ends trace on successful withdrawal', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: '0xHash',
        withdrawalId: 'withdrawal-123',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps Withdraw',
          id: 'mock-withdrawal-trace-id',
          data: expect.objectContaining({
            success: true,
            txHash: '0xHash',
            withdrawalId: 'withdrawal-123',
          }),
        }),
      );
    });

    it('sets withdrawal in progress state before provider call', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: '0xHash',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
    });

    it('calculates net amount after $1 USDC fee', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: '0xHash',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: { ...mockWithdrawParams, amount: '100' },
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      const updateCall = (mockContext.stateManager?.update as jest.Mock).mock
        .calls[0][0];
      const mockState: Pick<
        PerpsControllerState,
        | 'withdrawInProgress'
        | 'withdrawalRequests'
        | 'lastError'
        | 'lastUpdateTimestamp'
        | 'lastWithdrawResult'
      > = {
        withdrawInProgress: false,
        withdrawalRequests: [],
        lastError: null,
        lastUpdateTimestamp: 0,
        lastWithdrawResult: null,
      };
      updateCall(mockState);

      expect(mockState.withdrawalRequests[0].amount).toBe('99');
    });

    it('creates withdrawal request with pending status', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: '0xHash',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      const updateCall = (mockContext.stateManager?.update as jest.Mock).mock
        .calls[0][0];
      const mockState = {
        withdrawInProgress: false,
        withdrawalRequests: [],
        lastError: null,
        lastUpdateTimestamp: 0,
        lastWithdrawResult: null,
      };
      updateCall(mockState);

      expect(mockState.withdrawalRequests[0]).toEqual(
        expect.objectContaining({
          status: 'pending',
          success: false,
          asset: 'USDC',
          destination: mockWithdrawParams.destination,
        }),
      );
    });

    it('updates state with completed status when tx hash provided', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: '0xTransactionHash',
        withdrawalId: 'withdrawal-123',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      const updateCalls = (mockContext.stateManager?.update as jest.Mock).mock
        .calls;
      const successUpdateCall = updateCalls[1][0];
      const mockState = {
        withdrawInProgress: true,
        withdrawalRequests: [{ id: expect.any(String), status: 'pending' }],
        lastError: null,
        lastUpdateTimestamp: 0,
        lastWithdrawResult: null,
      };

      mockState.withdrawalRequests[0].id =
        mockState.withdrawalRequests[0].id || '';
      successUpdateCall(mockState);

      expect(mockState.withdrawInProgress).toBe(false);
      expect(mockState.lastWithdrawResult).toEqual(
        expect.objectContaining({
          success: true,
          txHash: '0xTransactionHash',
        }),
      );
    });

    it('updates state with bridging status when no tx hash', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        withdrawalId: 'withdrawal-123',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      const updateCalls = (mockContext.stateManager?.update as jest.Mock).mock
        .calls;
      expect(updateCalls.length).toBeGreaterThan(1);
    });

    it('triggers account refresh after successful withdrawal', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: '0xHash',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockRefreshAccountState).toHaveBeenCalledTimes(1);
    });

    it('tracks analytics event on successful withdrawal', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: '0xHash',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'mock-event',
        }),
      );
    });

    it('handles withdrawal failure from provider', async () => {
      const mockResult: WithdrawResult = {
        success: false,
        error: 'Insufficient balance',
      };
      mockProvider.withdraw.mockResolvedValue(mockResult);

      const result = await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
    });

    it('updates state with failed status on provider failure', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      const updateCalls = (mockContext.stateManager?.update as jest.Mock).mock
        .calls;
      const failureUpdateCall = updateCalls[updateCalls.length - 1][0];
      const mockState: Pick<
        PerpsControllerState,
        | 'withdrawInProgress'
        | 'withdrawalRequests'
        | 'lastError'
        | 'lastUpdateTimestamp'
        | 'lastWithdrawResult'
      > = {
        withdrawInProgress: true,
        withdrawalRequests: [
          {
            id: expect.any(String) as string,
            status: 'pending',
            success: false,
            amount: '100',
            asset: 'USDC',
            accountAddress: expect.any(String) as string,
            timestamp: Date.now(),
          },
        ],
        lastError: null,
        lastUpdateTimestamp: 0,
        lastWithdrawResult: null,
      };

      failureUpdateCall(mockState);

      expect(mockState.withdrawInProgress).toBe(false);
      expect(mockState.lastError).toBe('Insufficient balance');
      expect(mockState.lastWithdrawResult?.success).toBe(false);
    });

    it('tracks analytics event on withdrawal failure', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalled();
    });

    it('does not trigger account refresh on failure', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockRefreshAccountState).not.toHaveBeenCalled();
    });

    it('handles exception during withdrawal', async () => {
      const error = new Error('Network error');
      mockProvider.withdraw.mockRejectedValue(error);

      const result = await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('logs error on exception', async () => {
      const error = new Error('Network error');
      mockProvider.withdraw.mockRejectedValue(error);

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(Logger.error).toHaveBeenCalled();
    });

    it('updates state with error on exception', async () => {
      mockProvider.withdraw.mockRejectedValue(new Error('Network error'));

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      const updateCalls = (mockContext.stateManager?.update as jest.Mock).mock
        .calls;
      const errorUpdateCall = updateCalls[updateCalls.length - 1][0];
      const mockState = {
        withdrawInProgress: true,
        withdrawalRequests: [
          { id: expect.any(String), status: 'pending', success: false },
        ],
        lastError: null,
        lastUpdateTimestamp: 0,
        lastWithdrawResult: null,
      };

      errorUpdateCall(mockState);

      expect(mockState.lastError).toBe('Network error');
      expect(mockState.withdrawInProgress).toBe(false);
    });

    it('ends trace with error data on exception', async () => {
      mockProvider.withdraw.mockRejectedValue(new Error('Network error'));

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps Withdraw',
          id: 'mock-withdrawal-trace-id',
          data: expect.objectContaining({
            success: false,
            error: 'Network error',
          }),
        }),
      );
    });

    it('handles refresh account state error gracefully', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: '0xHash',
      });
      mockRefreshAccountState.mockRejectedValue(new Error('Refresh failed'));

      const result = await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(result.success).toBe(true);
    });

    it('generates unique withdrawal ID for tracking', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: '0xHash',
      });

      await AccountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      const updateCall = (mockContext.stateManager?.update as jest.Mock).mock
        .calls[0][0];
      const mockState: Pick<
        PerpsControllerState,
        | 'withdrawInProgress'
        | 'withdrawalRequests'
        | 'lastError'
        | 'lastUpdateTimestamp'
        | 'lastWithdrawResult'
      > = {
        withdrawInProgress: false,
        withdrawalRequests: [],
        lastError: null,
        lastUpdateTimestamp: 0,
        lastWithdrawResult: null,
      };
      updateCall(mockState);

      expect(mockState.withdrawalRequests[0].id).toMatch(
        /^withdraw-\d+-[a-z0-9]+$/,
      );
    });
  });

  describe('validateWithdrawal', () => {
    it('delegates to provider validateWithdrawal', async () => {
      const mockValidation = { isValid: true };
      mockProvider.validateWithdrawal.mockResolvedValue(mockValidation);

      const result = await AccountService.validateWithdrawal({
        provider: mockProvider,
        params: mockWithdrawParams,
      });

      expect(result).toEqual(mockValidation);
      expect(mockProvider.validateWithdrawal).toHaveBeenCalledWith(
        mockWithdrawParams,
      );
    });

    it('returns invalid when provider validation fails', async () => {
      const mockValidation = {
        isValid: false,
        error: 'Amount exceeds balance',
      };
      mockProvider.validateWithdrawal.mockResolvedValue(mockValidation);

      const result = await AccountService.validateWithdrawal({
        provider: mockProvider,
        params: mockWithdrawParams,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount exceeds balance');
    });

    it('throws error on exception', async () => {
      const error = new Error('Validation error');
      mockProvider.validateWithdrawal.mockRejectedValue(error);

      await expect(
        AccountService.validateWithdrawal({
          provider: mockProvider,
          params: mockWithdrawParams,
        }),
      ).rejects.toThrow('Validation error');
    });

    it('logs error on exception', async () => {
      const error = new Error('Validation error');
      mockProvider.validateWithdrawal.mockRejectedValue(error);

      await expect(
        AccountService.validateWithdrawal({
          provider: mockProvider,
          params: mockWithdrawParams,
        }),
      ).rejects.toThrow();

      expect(Logger.error).toHaveBeenCalled();
    });
  });
});
