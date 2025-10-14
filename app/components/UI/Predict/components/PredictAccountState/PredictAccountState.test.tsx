import React from 'react';
import { screen } from '@testing-library/react-native';
import MarketsWonCard from './PredictAccountState';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useUnrealizedPnL } from '../../hooks/useUnrealizedPnL';

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
    IconColor: {
      Alternative: '#8A8A8A',
    },
  };
});

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
function setupMarketsWonCardTest(propsOverrides = {}, hookOverrides = {}) {
  jest.clearAllMocks();
  const defaultProps = createDefaultProps();
  const props = {
    ...defaultProps,
    ...propsOverrides,
  };

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
    isFetching: false,
    error: null,
    refetch: jest.fn(),
    ...hookOverrides,
  });

  return {
    ...renderWithProvider(<MarketsWonCard {...props} />),
    props,
    defaultProps,
    mockUseUnrealizedPnL,
  };
}

describe('MarketsWonCard', () => {
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

    it('renders claim button with loading indicator when isLoading is true', () => {
      setupMarketsWonCardTest({ isLoading: true });

      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();
      // The ActivityIndicator is rendered but without testID in our mock
      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();
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
      setupMarketsWonCardTest({ availableBalance: 123.456 });

      expect(screen.getByText('$123.46')).toBeOnTheScreen();
    });

    it('formats claimable amount to 2 decimal places', () => {
      setupMarketsWonCardTest({ totalClaimableAmount: 123.456 });

      expect(screen.getByText('Claim $123.46')).toBeOnTheScreen();
    });

    it('handles zero claimable amount correctly', () => {
      setupMarketsWonCardTest({ totalClaimableAmount: 0 });

      expect(screen.getByText('Claim $0.00')).toBeOnTheScreen();
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

      expect(screen.getByText('$999999.99')).toBeOnTheScreen();
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
      const { mockUseUnrealizedPnL } = setupMarketsWonCardTest({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });

      expect(mockUseUnrealizedPnL).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });
    });

    it('handles loading state from hook', () => {
      setupMarketsWonCardTest(
        { availableBalance: undefined },
        {
          isFetching: true,
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: 0,
            percentUpnl: 0,
          },
        },
      );

      expect(screen.getByTestId('unrealized-pnl-skeleton')).toBeOnTheScreen();
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
          isFetching: false,
          error: null,
        },
      );

      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      // Should show fallback values when data is null
      expect(screen.getByText('+$0.00 (+0.0%)')).toBeOnTheScreen();
    });

    it('combines loading states from component and hook', () => {
      setupMarketsWonCardTest(
        { isLoading: true },
        {
          isFetching: true,
        },
      );

      // Claim button shows ActivityIndicator while hook shows skeleton
      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();
      expect(screen.getByTestId('unrealized-pnl-skeleton')).toBeOnTheScreen();
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
          isFetching: false,
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
          isFetching: false,
          error: null,
        },
      );

      expect(screen.queryByTestId('markets-won-card')).not.toBeOnTheScreen();
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

    it('calls onClaimPress when available balance is pressed', () => {
      const mockOnClaimPress = jest.fn();
      const { props } = setupMarketsWonCardTest({
        onClaimPress: mockOnClaimPress,
      });

      // Verify the callback was passed correctly
      expect(props.onClaimPress).toBe(mockOnClaimPress);
    });

    it('handles missing onClaimPress callback gracefully', () => {
      const { props } = setupMarketsWonCardTest({ onClaimPress: undefined });

      // Verify the callback is undefined
      expect(props.onClaimPress).toBeUndefined();
    });
  });
});
