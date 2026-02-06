import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useUnrealizedPnL } from '../../hooks/useUnrealizedPnL';
import { PredictPosition, PredictPositionStatus } from '../../types';
import MarketsWonCard from './PredictPositionsHeader';

// Mock account utilities
jest.mock('../../utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: jest.fn(() => ({
    id: 'test-account-id',
    address: '0x1234567890123456789012345678901234567890',
    type: 'eip155:eoa',
    name: 'Test Account',
    metadata: {
      lastSelected: 0,
    },
  })),
}));

// Mock Engine with AccountTreeController
jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      getAccountsFromSelectedAccountGroup: jest.fn(() => [
        {
          id: 'test-account-id',
          address: '0x1234567890123456789012345678901234567890',
          type: 'eip155:eoa',
          name: 'Test Account',
          metadata: {
            lastSelected: 0,
          },
        },
      ]),
    },
  },
}));

jest.mock('../../hooks/useUnrealizedPnL', () => ({
  useUnrealizedPnL: jest.fn(),
}));

const mockDeposit = jest.fn();
jest.mock('../../hooks/usePredictDeposit', () => ({
  usePredictDeposit: () => ({
    deposit: mockDeposit,
    status: 'IDLE',
  }),
  PredictDepositStatus: {
    IDLE: 'IDLE',
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    FAILED: 'FAILED',
  },
}));

const mockLoadBalance = jest.fn();
const mockBalanceResult: {
  balance: number | undefined;
  loadBalance: jest.Mock;
  isLoading: boolean;
  hasNoBalance: boolean;
  isRefreshing: boolean;
  error: string | null;
} = {
  balance: 100.5,
  loadBalance: mockLoadBalance,
  isLoading: false,
  hasNoBalance: false,
  isRefreshing: false,
  error: null,
};
jest.mock('../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => mockBalanceResult,
}));

const mockExecuteGuardedAction = jest.fn(async (action) => await action());
jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: mockExecuteGuardedAction,
    isEligible: true,
  }),
}));

const mockLoadClaimablePositions = jest.fn();
jest.mock('../../hooks/usePredictPositions', () => ({
  usePredictPositions: () => ({
    positions: [],
    isLoading: false,
    error: null,
    loadPositions: mockLoadClaimablePositions,
  }),
}));

const mockClaim = jest.fn();
jest.mock('../../hooks/usePredictClaim', () => ({
  usePredictClaim: () => ({
    claim: mockClaim,
    loading: false,
    completed: false,
    error: false,
  }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const mockStrings: Record<string, string> = {
      'predict.claim_amount_text': `Claim $${params?.amount || '0.00'}`,
      'predict.available_balance': 'Available Balance',
      'predict.unrealized_pnl_label': 'Unrealized P&L',
      'predict.unrealized_pnl_value': `${params?.amount || '+$0.00'} (${
        params?.percent || '+0.0%'
      })`,
    };
    return mockStrings[key] || key;
  }),
}));

function createTestState(_availableBalance?: number, claimableAmount?: number) {
  const testAddress = '0x1234567890123456789012345678901234567890';
  const testAccountId = 'test-account-id';

  const claimablePositions = claimableAmount
    ? ([
        {
          id: 'position-1',
          status: PredictPositionStatus.WON,
          cashPnl: claimableAmount,
          currentValue: claimableAmount,
          marketId: 'market-1',
          title: 'Test Market',
          outcome: 'Yes',
        },
      ] as unknown as PredictPosition[])
    : [];

  return {
    engine: {
      backgroundState: {
        PredictController: {
          claimablePositions: {
            [testAddress]: claimablePositions,
          },
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: testAccountId,
            accounts: {
              [testAccountId]: {
                id: testAccountId,
                address: testAddress,
                name: 'Test Account',
                type: 'eip155:eoa' as const,
                metadata: {
                  lastSelected: 0,
                },
              },
            },
          },
        },
      },
    },
  };
}

describe('MarketsWonCard', () => {
  const mockUseUnrealizedPnL = useUnrealizedPnL as jest.MockedFunction<
    typeof useUnrealizedPnL
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBalanceResult.balance = 100.5;
    mockBalanceResult.isLoading = false;

    mockUseUnrealizedPnL.mockReturnValue({
      unrealizedPnL: {
        user: '0x1234567890123456789012345678901234567890',
        cashUpnl: 8.63,
        percentUpnl: 3.9,
      },
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadUnrealizedPnL: jest.fn(),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('displays available balance and unrealized P&L', () => {
      const state = createTestState(100.5);

      renderWithProvider(<MarketsWonCard />, { state });

      expect(screen.getByTestId('markets-won-card')).toBeOnTheScreen();
      expect(screen.getByText('Available Balance')).toBeOnTheScreen();
      expect(screen.getByText('$100.50')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('+$8.63 (+3.9%)')).toBeOnTheScreen();
    });

    it('displays formatted balance value', () => {
      mockBalanceResult.balance = 1234.56;
      const state = createTestState(1234.56);

      renderWithProvider(<MarketsWonCard />, { state });

      expect(screen.getByText('$1,234.56')).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('navigates to market list when balance area is pressed', () => {
      const state = createTestState(50.25);

      renderWithProvider(<MarketsWonCard />, { state });

      const balanceTouchable =
        screen.getByTestId('markets-won-count').parent?.parent;
      if (balanceTouchable) {
        fireEvent.press(balanceTouchable);
      }

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: expect.any(String),
        },
      });
    });
  });

  describe('refresh', () => {
    it('reloads balance and unrealized P&L when refresh is called', async () => {
      const mockLoadUnrealizedPnL = jest.fn();
      mockUseUnrealizedPnL.mockReturnValue({
        unrealizedPnL: {
          user: '0x1234567890123456789012345678901234567890',
          cashUpnl: 8.63,
          percentUpnl: 3.9,
        },
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadUnrealizedPnL: mockLoadUnrealizedPnL,
      });
      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      const state = createTestState(100.5);

      renderWithProvider(<MarketsWonCard ref={ref} />, { state });

      await ref.current?.refresh();

      expect(mockLoadBalance).toHaveBeenCalledWith({ isRefresh: true });
      expect(mockLoadUnrealizedPnL).toHaveBeenCalledWith({ isRefresh: true });
    });
  });

  describe('loading states', () => {
    it('displays skeleton loader when balance is loading', () => {
      mockBalanceResult.isLoading = true;
      mockBalanceResult.balance = 100.5;
      const state = createTestState(100.5);

      renderWithProvider(<MarketsWonCard />, { state });

      expect(screen.getByTestId('markets-won-card')).toBeOnTheScreen();
      expect(screen.getByTestId('markets-won-count')).toBeOnTheScreen();
    });

    it('displays skeleton loader when unrealized P&L is loading', () => {
      mockUseUnrealizedPnL.mockReturnValue({
        unrealizedPnL: {
          user: '0x1234567890123456789012345678901234567890',
          cashUpnl: 0,
          percentUpnl: 0,
        },
        isLoading: true,
        isRefreshing: false,
        error: null,
        loadUnrealizedPnL: jest.fn(),
      });
      const state = createTestState(100.5);

      renderWithProvider(<MarketsWonCard />, { state });

      expect(screen.getByTestId('markets-won-card')).toBeOnTheScreen();
    });
  });

  describe('empty state', () => {
    it('returns null when no data is available', () => {
      mockBalanceResult.balance = undefined;
      mockBalanceResult.isLoading = false;
      mockUseUnrealizedPnL.mockReturnValue({
        unrealizedPnL: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadUnrealizedPnL: jest.fn(),
      });
      const state = createTestState();

      const { toJSON } = renderWithProvider(<MarketsWonCard />, { state });

      expect(toJSON()).toBeNull();
    });
  });

  describe('error handling', () => {
    it('calls onError callback when balance error occurs', () => {
      const mockOnError = jest.fn();
      mockBalanceResult.error = 'Balance fetch failed';
      mockBalanceResult.balance = 100.5;
      const state = createTestState(100.5);

      renderWithProvider(<MarketsWonCard onError={mockOnError} />, { state });

      expect(mockOnError).toHaveBeenCalledWith('Balance fetch failed');
    });

    it('calls onError callback when P&L error occurs', () => {
      const mockOnError = jest.fn();
      mockBalanceResult.error = null;
      mockBalanceResult.balance = 100.5;
      mockUseUnrealizedPnL.mockReturnValue({
        unrealizedPnL: {
          user: '0x1234567890123456789012345678901234567890',
          cashUpnl: 8.63,
          percentUpnl: 3.9,
        },
        isLoading: false,
        isRefreshing: false,
        error: 'P&L fetch failed',
        loadUnrealizedPnL: jest.fn(),
      });
      const state = createTestState(100.5);

      renderWithProvider(<MarketsWonCard onError={mockOnError} />, { state });

      expect(mockOnError).toHaveBeenCalledWith('P&L fetch failed');
    });

    it('prioritizes balance error over P&L error', () => {
      const mockOnError = jest.fn();
      mockBalanceResult.error = 'Balance error';
      mockBalanceResult.balance = 100.5;
      mockUseUnrealizedPnL.mockReturnValue({
        unrealizedPnL: {
          user: '0x1234567890123456789012345678901234567890',
          cashUpnl: 8.63,
          percentUpnl: 3.9,
        },
        isLoading: false,
        isRefreshing: false,
        error: 'P&L error',
        loadUnrealizedPnL: jest.fn(),
      });
      const state = createTestState(100.5);

      renderWithProvider(<MarketsWonCard onError={mockOnError} />, { state });

      expect(mockOnError).toHaveBeenCalledWith('Balance error');
    });
  });
});
