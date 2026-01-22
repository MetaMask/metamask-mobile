import { AccountService } from './AccountService';
import {
  createMockServiceContext,
  createMockInfrastructure,
} from '../../__mocks__/serviceMocks';
import { createMockHyperLiquidProvider } from '../../__mocks__/providerMocks';
import type { ServiceContext } from './ServiceContext';
import {
  PerpsAnalyticsEvent,
  type IPerpsProvider,
  type WithdrawParams,
  type WithdrawResult,
  type IPerpsPlatformDependencies,
} from '../types';
import type { PerpsControllerState } from '../PerpsController';

jest.mock('uuid', () => ({ v4: () => 'mock-withdrawal-trace-id' }));
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
// Note: EVM account is now retrieved via dependency injection (deps.controllers.accounts.getSelectedEvmAccount)
// The mock is set up via createMockInfrastructure() in serviceMocks.ts

describe('AccountService', () => {
  let mockProvider: jest.Mocked<IPerpsProvider>;
  let mockContext: ServiceContext;
  let mockRefreshAccountState: jest.Mock;
  let mockDeps: IPerpsPlatformDependencies;
  let accountService: AccountService;

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

    // Create mock dependencies and service instance
    mockDeps = createMockInfrastructure();
    accountService = new AccountService(mockDeps);

    jest.clearAllMocks();

    // Mock Date.now() to return a stable timestamp
    jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
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

      const result = await accountService.withdraw({
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

      await accountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps Withdraw',
          id: 'mock-withdrawal-trace-id',
          tags: expect.objectContaining({
            assetId: mockWithdrawParams.assetId,
            provider: 'hyperliquid',
            isTestnet: 'false',
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

      await accountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
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

      await accountService.withdraw({
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

      await accountService.withdraw({
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

      await accountService.withdraw({
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

      await accountService.withdraw({
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

      await accountService.withdraw({
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

      await accountService.withdraw({
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

      await accountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockDeps.metrics.trackPerpsEvent).toHaveBeenCalledWith(
        PerpsAnalyticsEvent.WithdrawalTransaction,
        expect.objectContaining({
          status: 'executed',
        }),
      );
    });

    it('handles withdrawal failure from provider', async () => {
      const mockResult: WithdrawResult = {
        success: false,
        error: 'Insufficient balance',
      };
      mockProvider.withdraw.mockResolvedValue(mockResult);

      const result = await accountService.withdraw({
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

      await accountService.withdraw({
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

      await accountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockDeps.metrics.trackPerpsEvent).toHaveBeenCalledWith(
        PerpsAnalyticsEvent.WithdrawalTransaction,
        expect.objectContaining({
          status: 'failed',
        }),
      );
    });

    it('does not trigger account refresh on failure', async () => {
      mockProvider.withdraw.mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
      });

      await accountService.withdraw({
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

      const result = await accountService.withdraw({
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

      await accountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('updates state with error on exception', async () => {
      mockProvider.withdraw.mockRejectedValue(new Error('Network error'));

      await accountService.withdraw({
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

      await accountService.withdraw({
        provider: mockProvider,
        params: mockWithdrawParams,
        context: mockContext,
        refreshAccountState: mockRefreshAccountState,
      });

      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
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

      const result = await accountService.withdraw({
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

      await accountService.withdraw({
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

      const result = await accountService.validateWithdrawal({
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

      const result = await accountService.validateWithdrawal({
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
        accountService.validateWithdrawal({
          provider: mockProvider,
          params: mockWithdrawParams,
        }),
      ).rejects.toThrow('Validation error');
    });

    it('logs error on exception', async () => {
      const error = new Error('Validation error');
      mockProvider.validateWithdrawal.mockRejectedValue(error);

      await expect(
        accountService.validateWithdrawal({
          provider: mockProvider,
          params: mockWithdrawParams,
        }),
      ).rejects.toThrow();

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });
});
