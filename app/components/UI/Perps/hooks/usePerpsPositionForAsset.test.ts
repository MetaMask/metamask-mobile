import { act, waitFor } from '@testing-library/react-native';
import type { RootState } from '../../../../reducers';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import type { AccountState, Position } from '../controllers/types';
import {
  usePerpsPositionForAsset,
  _clearPositionCache,
} from './usePerpsPositionForAsset';
import { usePerpsTrading } from './usePerpsTrading';

// Mock dependencies
jest.mock('./usePerpsTrading');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
  typeof usePerpsTrading
>;

const mockPosition: Position = {
  symbol: 'ETH',
  size: '2',
  entryPrice: '3000',
  positionValue: '6000',
  unrealizedPnl: '100',
  returnOnEquity: '0.03',
  leverage: {
    type: 'cross',
    value: 3,
    rawUsd: '2000',
  },
  liquidationPrice: '2500',
  marginUsed: '800',
  maxLeverage: 50,
  cumulativeFunding: {
    allTime: '20',
    sinceOpen: '5',
    sinceChange: '2',
  },
  takeProfitCount: 1,
  stopLossCount: 1,
};

const mockAccountState: AccountState = {
  availableBalance: '10000',
  marginUsed: '800',
  unrealizedPnl: '100',
  returnOnEquity: '0.03',
  totalBalance: '10500',
};

const mockUserAddress = '0x1234567890123456789012345678901234567890';

const createMockState = (
  overrides?: Partial<{ isTestnet: boolean }>,
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      PerpsController: {
        isTestnet: false,
        ...overrides,
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'account-1',
          accounts: {
            'account-1': {
              id: 'account-1',
              type: 'eip155:eoa',
              address: mockUserAddress,
              metadata: {
                name: 'Account 1',
                keyring: { type: 'HD Key Tree' },
                importTime: 1234567890,
                lastSelected: 1234567890,
              },
              scopes: ['eip155:1'],
              methods: [],
              options: {},
            },
          },
        },
      },
    },
  },
});

describe('usePerpsPositionForAsset', () => {
  let mockGetPositions: jest.Mock;
  let mockGetAccountState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    _clearPositionCache();

    mockGetPositions = jest.fn().mockResolvedValue([mockPosition]);
    mockGetAccountState = jest.fn().mockResolvedValue(mockAccountState);

    mockUsePerpsTrading.mockReturnValue({
      getPositions: mockGetPositions,
      getAccountState: mockGetAccountState,
      placeOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
      getMarkets: jest.fn(),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      depositWithConfirmation: jest.fn(),
      depositWithOrder: jest.fn(),
      clearDepositResult: jest.fn(),
      withdraw: jest.fn(),
      calculateLiquidationPrice: jest.fn(),
      calculateMaintenanceMargin: jest.fn(),
      getMaxLeverage: jest.fn(),
      updatePositionTPSL: jest.fn(),
      updateMargin: jest.fn(),
      flipPosition: jest.fn(),
      calculateFees: jest.fn(),
      validateOrder: jest.fn(),
      validateClosePosition: jest.fn(),
      validateWithdrawal: jest.fn(),
      getOrderFills: jest.fn(),
      getOrders: jest.fn(),
      getFunding: jest.fn(),
    });
  });

  describe('Initial state', () => {
    it('returns loading state when symbol is provided', async () => {
      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.position).toBeNull();
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('returns empty state when symbol is null', () => {
      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset(null),
        { state: createMockState() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.position).toBeNull();
      expect(result.current.hasFundsInPerps).toBe(false);
      expect(result.current.accountState).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('returns empty state when symbol is undefined', () => {
      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset(undefined),
        { state: createMockState() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.position).toBeNull();
      expect(result.current.hasFundsInPerps).toBe(false);
    });
  });

  describe('Successful position fetching', () => {
    it('fetches position for matching symbol', async () => {
      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.position).toEqual(mockPosition);
      expect(result.current.hasFundsInPerps).toBe(true);
      expect(result.current.accountState).toEqual(mockAccountState);
      expect(result.current.error).toBeNull();
    });

    it('calls getPositions with readOnly mode and user address', async () => {
      renderHookWithProvider(() => usePerpsPositionForAsset('ETH'), {
        state: createMockState(),
      });

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledWith({
          readOnly: true,
          userAddress: mockUserAddress,
        });
      });

      expect(mockGetAccountState).toHaveBeenCalledWith({
        readOnly: true,
        userAddress: mockUserAddress,
      });
    });

    it('handles case-insensitive symbol matching', async () => {
      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('eth'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.position).toEqual(mockPosition);
    });

    it('returns null position when no matching symbol found', async () => {
      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('BTC'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.position).toBeNull();
      expect(result.current.hasFundsInPerps).toBe(true);
      expect(result.current.accountState).toEqual(mockAccountState);
    });

    it('returns hasFundsInPerps false when balance is zero', async () => {
      mockGetAccountState.mockResolvedValue({
        ...mockAccountState,
        totalBalance: '0',
      });

      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasFundsInPerps).toBe(false);
    });
  });

  describe('Caching behavior', () => {
    it('uses cached data on subsequent calls', async () => {
      const { result, rerender } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetPositions).toHaveBeenCalledTimes(1);

      rerender({});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetPositions).toHaveBeenCalledTimes(1);
      expect(result.current.position).toEqual(mockPosition);
    });

    it('fetches fresh data after cache clear', async () => {
      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetPositions).toHaveBeenCalledTimes(1);

      _clearPositionCache();

      const { result: result2 } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      expect(mockGetPositions).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('handles API errors gracefully', async () => {
      mockGetPositions.mockRejectedValue(new Error('Network error'));

      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.position).toBeNull();
      expect(result.current.hasFundsInPerps).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('handles non-Error exceptions', async () => {
      mockGetPositions.mockRejectedValue('String error');

      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to check perps position');
    });
  });

  describe('Empty positions array', () => {
    it('handles empty positions array', async () => {
      mockGetPositions.mockResolvedValue([]);

      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.position).toBeNull();
      expect(result.current.hasFundsInPerps).toBe(true);
    });
  });

  describe('Multiple positions', () => {
    it('finds the correct position from multiple', async () => {
      const btcPosition: Position = {
        ...mockPosition,
        symbol: 'BTC',
        size: '0.5',
        entryPrice: '45000',
      };

      mockGetPositions.mockResolvedValue([btcPosition, mockPosition]);

      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.position).toEqual(mockPosition);
      expect(result.current.position?.symbol).toBe('ETH');
    });
  });

  describe('Network awareness', () => {
    it('includes network in cache key for testnet', async () => {
      const { result } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState({ isTestnet: true }) },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.position).toEqual(mockPosition);
    });
  });

  describe('Unmount behavior', () => {
    it('does not update state after unmount', async () => {
      let resolvePromise: (value: Position[]) => void;
      const slowPromise = new Promise<Position[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetPositions.mockReturnValue(slowPromise);

      const { result, unmount } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      expect(result.current.isLoading).toBe(true);

      unmount();

      await act(async () => {
        resolvePromise([mockPosition]);
      });

      // No error should be thrown - state update should be prevented
    });
  });

  describe('Stale request handling', () => {
    it('ignores stale error responses when symbol changes rapidly', async () => {
      let rejectFirst: (error: Error) => void;
      const slowError = new Promise<Position[]>((_, reject) => {
        rejectFirst = reject;
      });
      mockGetPositions
        .mockReturnValueOnce(slowError)
        .mockResolvedValue([mockPosition]);

      renderHookWithProvider(() => usePerpsPositionForAsset('BTC'), {
        state: createMockState(),
      });

      // Clear cache and immediately switch symbol
      _clearPositionCache();

      // Rerender with different symbol (simulates rapid change)
      const { result: result2 } = renderHookWithProvider(
        () => usePerpsPositionForAsset('ETH'),
        { state: createMockState() },
      );

      // Let the first (stale) request error out
      await act(async () => {
        rejectFirst(new Error('Stale error'));
      });

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      // The ETH position should be fetched successfully
      expect(result2.current.position?.symbol).toBe('ETH');
    });
  });
});
