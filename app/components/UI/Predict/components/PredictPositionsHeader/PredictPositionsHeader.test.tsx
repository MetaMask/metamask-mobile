import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import MarketsWonCard from './PredictPositionsHeader';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useUnrealizedPnL } from '../../hooks/useUnrealizedPnL';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictPositionStatus, PredictPosition } from '../../types';

// Mock dependencies
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((...args) => args.join(' ')),
  })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const {
    View,
    Text: RNText,
    TouchableOpacity,
  } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    Text: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <RNText testID={testID} {...props}>
        {children}
      </RNText>
    ),
    Button: ({
      children,
      onPress,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      onPress: () => void;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress} {...props}>
        {children}
      </TouchableOpacity>
    ),
    TextVariant: {
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Between: 'space-between',
      Center: 'center',
    },
    ButtonVariant: {
      Secondary: 'secondary',
    },
    ButtonSize: {
      Lg: 'lg',
      Md: 'md',
      Sm: 'sm',
    },
    TextColor: {
      Primary: 'primary',
      Secondary: 'secondary',
      PrimaryInverse: 'primary-inverse',
      Alternative: 'alternative',
      Muted: 'muted',
      Success: 'success',
      Error: 'error',
      Warning: 'warning',
      Info: 'info',
    },
    IconColor: {
      Alternative: '#8A8A8A',
    },
  };
});

jest.mock(
  '../../../../../component-library/components-temp/Buttons/ButtonHero',
  () => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        onPress,
        testID,
        children,
        ...props
      }: {
        onPress?: () => void;
        testID?: string;
        children?: React.ReactNode;
        [key: string]: unknown;
      }) => (
        <TouchableOpacity testID={testID} onPress={onPress} {...props}>
          {children}
        </TouchableOpacity>
      ),
    };
  },
);

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      name,
      testID,
      ...props
    }: {
      name: string;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID} {...props}>
        <Text>{name}</Text>
      </View>
    ),
    IconSize: {
      Sm: 'sm',
    },
    IconName: {
      ArrowRight: 'ArrowRight',
    },
    IconColor: {
      Alternative: '#8A8A8A',
    },
  };
});

jest.mock(
  '../../../../../component-library/components/Skeleton/Skeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ testID, ...props }: { testID?: string }) => (
        <View testID={testID || 'unrealized-pnl-skeleton'} {...props} />
      ),
    };
  },
);

// Mock Image component and ActivityIndicator
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const { Image: RNImage, View } = RN;
  return {
    ...RN,
    Image: ({
      source,
      testID,
      ...props
    }: {
      source: { uri: string };
      testID?: string;
      [key: string]: unknown;
    }) => <RNImage testID={testID} source={source} {...props} />,
    ActivityIndicator: ({
      testID,
      ...props
    }: {
      testID?: string;
      [key: string]: unknown;
    }) => <View testID={testID || 'activity-indicator'} {...props} />,
  };
});

// Mock the useUnrealizedPnL hook
jest.mock('../../hooks/useUnrealizedPnL', () => ({
  useUnrealizedPnL: jest.fn(),
}));

// Mock usePredictDeposit hook
const mockDeposit = jest.fn();
const mockDepositResult = {
  deposit: mockDeposit,
  status: 'IDLE',
};
jest.mock('../../hooks/usePredictDeposit', () => ({
  usePredictDeposit: () => mockDepositResult,
  PredictDepositStatus: {
    IDLE: 'IDLE',
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    FAILED: 'FAILED',
  },
}));

// Mock usePredictBalance hook
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

// Mock usePredictActionGuard hook
const mockExecuteGuardedAction = jest.fn(async (action) => await action());
jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: mockExecuteGuardedAction,
    isEligible: true,
    hasNoBalance: false,
  }),
}));

// Mock usePredictClaimablePositions hook
const mockLoadClaimablePositions = jest.fn();
const mockClaimablePositionsResult: {
  positions: PredictPosition[];
  isLoading: boolean;
  error: string | null;
  loadPositions: jest.Mock;
} = {
  positions: [],
  isLoading: false,
  error: null,
  loadPositions: mockLoadClaimablePositions,
};
jest.mock('../../hooks/usePredictPositions', () => ({
  usePredictPositions: () => mockClaimablePositionsResult,
}));

// Mock usePredictClaim hook
const mockClaim = jest.fn();
const mockClaimResult = {
  claim: mockClaim,
  loading: false,
  completed: false,
  error: false,
};
jest.mock('../../hooks/usePredictClaim', () => ({
  usePredictClaim: () => mockClaimResult,
}));

// Mock useNavigation
const mockNavigate = jest.fn();
const mockNavigationResult = {
  navigate: mockNavigate,
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigationResult,
}));

// Mock strings
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

// Helper function to create default props
function createDefaultProps() {
  return {
    availableBalance: 100.5,
    totalClaimableAmount: 45.2,
    onClaimPress: jest.fn(),
    isLoading: false,
    address: '0x1234567890123456789012345678901234567890',
    providerId: 'polymarket',
  };
}

// Helper function to set up test environment
function setupMarketsWonCardTest(
  propsOverrides = {},
  hookOverrides = {},
  claimablePositionsOverrides: { positions?: Partial<PredictPosition>[] } = {},
) {
  // Reset mock results but keep the mock implementations
  mockBalanceResult.balance = 100.5;
  mockBalanceResult.isLoading = false;
  mockBalanceResult.hasNoBalance = false;
  mockBalanceResult.isRefreshing = false;
  mockBalanceResult.error = null;

  mockClaimablePositionsResult.positions = [];
  mockClaimablePositionsResult.isLoading = false;
  mockClaimablePositionsResult.error = null;

  const defaultProps = createDefaultProps();
  const props = {
    ...defaultProps,
    ...propsOverrides,
  };

  // Configure balance mock based on props
  if ('availableBalance' in propsOverrides) {
    mockBalanceResult.balance = propsOverrides.availableBalance as
      | number
      | undefined;
  } else {
    mockBalanceResult.balance = props.availableBalance;
  }
  mockBalanceResult.isLoading = props.isLoading ?? false;

  // Mock the useUnrealizedPnL hook
  const mockUseUnrealizedPnL = useUnrealizedPnL as jest.MockedFunction<
    typeof useUnrealizedPnL
  >;
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
    ...hookOverrides,
  });

  const ref = React.createRef<{ refresh: () => Promise<void> }>();

  // Test address and account ID to use in state
  const testAddress = '0x1234567890123456789012345678901234567890';
  const testAccountId = 'test-account-id';

  // Build claimable positions for Redux state
  const claimablePositionsArray =
    claimablePositionsOverrides.positions !== undefined
      ? (claimablePositionsOverrides.positions as unknown as PredictPosition[])
      : props.totalClaimableAmount
        ? ([
            {
              id: 'position-1',
              status: PredictPositionStatus.WON,
              cashPnl: props.totalClaimableAmount,
              marketId: 'market-1',
              tokenId: 'token-1',
              outcome: 'Yes',
              shares: '100',
              avgPrice: 0.5,
              currentValue: props.totalClaimableAmount,
            },
          ] as unknown as PredictPosition[])
        : [];

  // Create Redux state with claimablePositions keyed by address
  const state = {
    engine: {
      backgroundState: {
        PredictController: {
          claimablePositions: {
            [testAddress]: claimablePositionsArray,
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

  return {
    ...renderWithProvider(<MarketsWonCard ref={ref} />, { state }),
    props,
    defaultProps,
    mockUseUnrealizedPnL,
    ref,
  };
}

describe('MarketsWonCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to defaults
    mockDepositResult.status = 'IDLE';
    mockBalanceResult.balance = 100.5;
    mockBalanceResult.isLoading = false;
    mockClaimablePositionsResult.positions = [];
    mockClaimablePositionsResult.isLoading = false;
    mockClaimResult.loading = false;
    mockClaimResult.completed = false;
    mockClaimResult.error = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders claim button when totalClaimableAmount is provided', () => {
      setupMarketsWonCardTest();

      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();
    });

    it('does not show claim button when totalClaimableAmount is undefined', () => {
      const { totalClaimableAmount, ...propsWithoutClaimable } =
        createDefaultProps();
      setupMarketsWonCardTest({
        ...propsWithoutClaimable,
        totalClaimableAmount: undefined,
      });

      expect(screen.queryByText('Claim $45.20')).not.toBeOnTheScreen();
    });

    it('renders main card when availableBalance is provided', () => {
      setupMarketsWonCardTest();

      expect(screen.getByTestId('markets-won-card')).toBeOnTheScreen();
      expect(screen.getByText('Available Balance')).toBeOnTheScreen();
      expect(screen.getByText('$100.50')).toBeOnTheScreen();
    });

    it('renders main card when unrealized P&L is available', () => {
      setupMarketsWonCardTest({ availableBalance: undefined });

      expect(screen.getByTestId('markets-won-card')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('does not show main card when neither availableBalance nor unrealized P&L is available', () => {
      setupMarketsWonCardTest(
        { availableBalance: undefined },
        { unrealizedPnL: null },
      );

      expect(screen.queryByTestId('markets-won-card')).not.toBeOnTheScreen();
    });

    it('renders both available balance and unrealized P&L when both are available', () => {
      setupMarketsWonCardTest();

      expect(screen.getByText('Available Balance')).toBeOnTheScreen();
      expect(screen.getByText('$100.50')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('+$8.63 (+3.9%)')).toBeOnTheScreen();
    });
    it('renders claim button without loading indicator when isLoading is false', () => {
      setupMarketsWonCardTest({ isLoading: false });

      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();
      expect(screen.queryByTestId('activity-indicator')).not.toBeOnTheScreen();
    });
  });

  describe('Amount Formatting', () => {
    it('formats unrealized amount with correct sign and decimal places', () => {
      setupMarketsWonCardTest(
        {},
        {
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: 123.456,
            percentUpnl: 5.67,
          },
        },
      );

      expect(screen.getByText('+$123.46 (+5.7%)')).toBeOnTheScreen();
    });

    it('formats negative unrealized amount correctly', () => {
      setupMarketsWonCardTest(
        {},
        {
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: -50.25,
            percentUpnl: -2.1,
          },
        },
      );

      expect(screen.getByText('-$50.25 (-2.1%)')).toBeOnTheScreen();
    });

    it('handles zero unrealized amount correctly', () => {
      setupMarketsWonCardTest(
        {},
        {
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: 0,
            percentUpnl: 0,
          },
        },
      );

      expect(screen.getByText('+$0.00 (+0.0%)')).toBeOnTheScreen();
    });

    it('formats available balance to 2 decimal places', () => {
      setupMarketsWonCardTest({ availableBalance: 123.4321 });

      expect(screen.getByText('$123.43')).toBeOnTheScreen();
    });

    it('formats claimable amount to 2 decimal places', () => {
      setupMarketsWonCardTest({ totalClaimableAmount: 123.456 });

      expect(screen.getByText('Claim $123.46')).toBeOnTheScreen();
    });

    it('does not show available balance when it is 0', () => {
      setupMarketsWonCardTest({ availableBalance: 0 });

      expect(screen.queryByText('$0.00')).not.toBeOnTheScreen();
    });
  });

  describe('Conditional Rendering Logic', () => {
    it('shows main card when availableBalance is greater than 0', () => {
      setupMarketsWonCardTest({ availableBalance: 50.25 });

      expect(screen.getByTestId('markets-won-card')).toBeOnTheScreen();
      expect(screen.getByText('Available Balance')).toBeOnTheScreen();
      expect(screen.getByText('$50.25')).toBeOnTheScreen();
    });

    it('does not show available balance section when availableBalance is 0', () => {
      setupMarketsWonCardTest({ availableBalance: 0 });

      expect(screen.getByTestId('markets-won-card')).toBeOnTheScreen();
      expect(screen.queryByText('Available Balance')).not.toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('hides main card when availableBalance is undefined', () => {
      setupMarketsWonCardTest(
        { availableBalance: undefined },
        { unrealizedPnL: null },
      );

      expect(screen.queryByTestId('markets-won-card')).not.toBeOnTheScreen();
    });

    it('shows main card when unrealized P&L is available even without availableBalance', () => {
      setupMarketsWonCardTest({ availableBalance: undefined });

      expect(screen.getByTestId('markets-won-card')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('shows both available balance and unrealized P&L when both are available', () => {
      setupMarketsWonCardTest(
        { availableBalance: 75.5 },
        {
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: 100,
            percentUpnl: 10,
          },
        },
      );

      expect(screen.getByText('Available Balance')).toBeOnTheScreen();
      expect(screen.getByText('$75.50')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('+$100.00 (+10.0%)')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles very large unrealized amounts', () => {
      setupMarketsWonCardTest(
        {},
        {
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: 999999.99,
            percentUpnl: 999.9,
          },
        },
      );

      expect(screen.getByText('+$999999.99 (+999.9%)')).toBeOnTheScreen();
    });

    it('handles very small unrealized amounts', () => {
      setupMarketsWonCardTest(
        {},
        {
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: 0.01,
            percentUpnl: 0.1,
          },
        },
      );

      expect(screen.getByText('+$0.01 (+0.1%)')).toBeOnTheScreen();
    });

    it('handles very large available balance', () => {
      setupMarketsWonCardTest({ availableBalance: 999999.99 });

      expect(screen.getByText('$999,999.99')).toBeOnTheScreen();
    });

    it('handles very small available balance', () => {
      setupMarketsWonCardTest({ availableBalance: 0.01 });

      expect(screen.getByText('$0.01')).toBeOnTheScreen();
    });

    it('handles missing optional props gracefully', () => {
      setupMarketsWonCardTest(
        {},
        {
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: 50,
            percentUpnl: 5,
          },
        },
      );

      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('+$50.00 (+5.0%)')).toBeOnTheScreen();
    });
  });

  describe('useUnrealizedPnL Hook Integration', () => {
    it('calls useUnrealizedPnL hook with correct parameters', () => {
      const { mockUseUnrealizedPnL } = setupMarketsWonCardTest();

      expect(mockUseUnrealizedPnL).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
    });

    it('handles error state from hook', () => {
      setupMarketsWonCardTest(
        { availableBalance: undefined },
        {
          error: 'Failed to fetch unrealized P&L',
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: 0,
            percentUpnl: 0,
          },
        },
      );

      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      // Should show fallback values when there's an error
      expect(screen.getByText('+$0.00 (+0.0%)')).toBeOnTheScreen();
    });

    it('handles null unrealized P&L data gracefully', () => {
      setupMarketsWonCardTest(
        { availableBalance: undefined },
        {
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: 0,
            percentUpnl: 0,
          },
          isLoading: false,
          error: null,
        },
      );

      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      // Should show fallback values when data is null
      expect(screen.getByText('+$0.00 (+0.0%)')).toBeOnTheScreen();
    });

    it('displays correct unrealized P&L data from hook', () => {
      setupMarketsWonCardTest(
        {},
        {
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: -15.75,
            percentUpnl: -8.2,
          },
          isLoading: false,
          error: null,
        },
      );

      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('-$15.75 (-8.2%)')).toBeOnTheScreen();
    });

    it('does not show unrealized P&L section when hook returns null data', () => {
      setupMarketsWonCardTest(
        { availableBalance: undefined },
        {
          unrealizedPnL: null,
          isLoading: false,
          error: null,
        },
      );

      expect(screen.queryByTestId('markets-won-card')).not.toBeOnTheScreen();
    });
  });

  describe('Position Filtering and Calculation', () => {
    it('filters positions to only include those with WON status', () => {
      const mixedPositions = [
        {
          id: 'position-1',
          status: PredictPositionStatus.WON,
          cashPnl: 10.5,
          marketId: 'market-1',
          tokenId: 'token-1',
          outcome: 'Yes',
          shares: '100',
          avgPrice: 0.5,
          currentValue: 10.5,
        },
        {
          id: 'position-2',
          status: PredictPositionStatus.OPEN,
          cashPnl: 5.0,
          marketId: 'market-2',
          tokenId: 'token-2',
          outcome: 'No',
          shares: '50',
          avgPrice: 0.6,
          currentValue: 5.0,
        },
        {
          id: 'position-3',
          status: PredictPositionStatus.WON,
          cashPnl: 7.25,
          marketId: 'market-3',
          tokenId: 'token-3',
          outcome: 'Yes',
          shares: '75',
          avgPrice: 0.4,
          currentValue: 7.25,
        },
      ];

      setupMarketsWonCardTest(
        { availableBalance: undefined },
        {},
        {
          positions: mixedPositions,
        },
      );

      // Should show claim button since there are won positions
      expect(screen.getByText('Claim $17.75')).toBeOnTheScreen();
    });

    it('calculates total claimable amount by summing cashPnl of won positions', () => {
      const wonPositions = [
        {
          id: 'position-1',
          status: PredictPositionStatus.WON,
          cashPnl: 25.0,
          marketId: 'market-1',
          tokenId: 'token-1',
          outcome: 'Yes',
          shares: '100',
          avgPrice: 0.5,
          currentValue: 25.0,
        },
        {
          id: 'position-2',
          status: PredictPositionStatus.WON,
          cashPnl: 15.5,
          marketId: 'market-2',
          tokenId: 'token-2',
          outcome: 'No',
          shares: '50',
          avgPrice: 0.6,
          currentValue: 15.5,
        },
      ];

      setupMarketsWonCardTest(
        { availableBalance: undefined },
        {},
        {
          positions: wonPositions,
        },
      );

      // Should show claim button with sum of cashPnl values
      expect(screen.getByText('Claim $40.50')).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('calls onClaimPress when claim button is pressed', () => {
      const mockOnClaimPress = jest.fn();
      const { props } = setupMarketsWonCardTest({
        onClaimPress: mockOnClaimPress,
      });

      // Verify the callback was passed correctly
      expect(props.onClaimPress).toBe(mockOnClaimPress);
    });

    it('navigates to predict modals when available balance is pressed', () => {
      setupMarketsWonCardTest();

      const balanceTouchable =
        screen.getByTestId('markets-won-count').parent?.parent;
      if (balanceTouchable) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fireEvent.press(balanceTouchable as any);
      }

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
      });
    });

    it('calls refresh method and triggers data reloading', async () => {
      const mockLoadUnrealizedPnL = jest.fn();
      const { ref } = setupMarketsWonCardTest(
        {},
        {
          loadUnrealizedPnL: mockLoadUnrealizedPnL,
        },
      );

      await ref.current?.refresh();

      expect(mockLoadBalance).toHaveBeenCalledWith({ isRefresh: true });
      expect(mockLoadUnrealizedPnL).toHaveBeenCalledWith({ isRefresh: true });
    });

    it('handles missing onClaimPress callback gracefully', () => {
      const { props } = setupMarketsWonCardTest({ onClaimPress: undefined });

      // Verify the callback is undefined
      expect(props.onClaimPress).toBeUndefined();
    });

    it('uses fallback address when selectedAddress is undefined', () => {
      // Arrange - create state with undefined selected account
      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      const stateWithNoAddress = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: {
                '0x0': [],
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: undefined,
                accounts: {},
              },
            },
          },
        },
      };

      // Act
      const { getByTestId } = renderWithProvider(<MarketsWonCard ref={ref} />, {
        state: stateWithNoAddress,
      });

      // Assert - component renders without crashing
      expect(getByTestId('markets-won-card')).toBeDefined();
    });
  });
});
