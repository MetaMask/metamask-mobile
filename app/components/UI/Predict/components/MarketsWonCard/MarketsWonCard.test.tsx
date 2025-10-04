import React from 'react';
import { screen } from '@testing-library/react-native';
import MarketsWonCard from './MarketsWonCard';
import { PredictPosition as PredictPositionType } from '../../types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useUnrealizedPnL } from '../../hooks/useUnrealizedPnL';

// Mock dependencies
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((...args) => args.join(' ')),
  })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text: RNText } = jest.requireActual('react-native');
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
    Icon: ({
      name,
      testID,
      ...props
    }: {
      name: string;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID} {...props}>
        <RNText>{name}</RNText>
      </View>
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
    },
    FontWeight: {
      Medium: 'medium',
    },
    IconName: {
      Info: 'Info',
      ArrowRight: 'ArrowRight',
    },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      testID,
      ...props
    }: {
      label: string;
      onPress: () => void;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress} {...props}>
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
    ButtonSize: {
      Lg: 'lg',
    },
    ButtonVariants: {
      Primary: 'primary',
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

// Helper function to create mock positions
function createMockPositions(): PredictPositionType[] {
  return [
    {
      id: 'position-1',
      amount: 100,
      conditionId: 'condition-1',
      outcomeIndex: 0,
      icon: 'https://example.com/icon1.png',
      currentValue: 60,
      title: 'Position 1',
      providerId: 'polymarket',
      marketId: 'market-1',
      outcomeId: 'condition-1',
      outcomeTokenId: 'position-1',
      outcome: 'Yes',
      size: 100,
      price: 0.6,
      status: 'open',
      cashPnl: 10,
      percentPnl: 5,
      initialValue: 50,
      avgPrice: 0.5,
      endDate: '2024-12-31',
      claimable: false,
      // Add other required properties based on PredictPosition type
    } as PredictPositionType,
    {
      id: 'position-2',
      amount: 50,
      conditionId: 'condition-2',
      outcomeIndex: 1,
      icon: 'https://example.com/icon2.png',
      currentValue: 20,
      title: 'Position 2',
      providerId: 'polymarket',
      marketId: 'market-2',
      outcomeId: 'condition-2',
      outcomeTokenId: 'position-2',
      outcome: 'No',
      size: 50,
      price: 0.4,
      status: 'open',
      cashPnl: -5,
      percentPnl: -10,
      initialValue: 25,
      avgPrice: 0.5,
      endDate: '2024-12-31',
      claimable: true,
    } as PredictPositionType,
    {
      id: 'position-3',
      conditionId: 'condition-3',
      amount: 100,
      outcomeIndex: 0,
      icon: 'https://example.com/icon3.png',
      currentValue: 30,
      title: 'Position 3',
      providerId: 'polymarket',
      marketId: 'market-3',
      outcomeId: 'condition-3',
      outcomeTokenId: 'position-3',
      outcome: 'Yes',
      size: 100,
      price: 0.7,
      status: 'open',
      cashPnl: 15,
      percentPnl: 15,
      initialValue: 30,
      avgPrice: 0.7,
      endDate: '2024-12-31',
      claimable: false,
    } as PredictPositionType,
  ];
}

// Helper function to create default props
function createDefaultProps() {
  return {
    positions: createMockPositions(),
    numberOfMarketsWon: 2,
    totalClaimableAmount: 45.2,
    onClaimPress: jest.fn(),
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
    it('renders the component with won markets row when numberOfMarketsWon is provided', () => {
      setupMarketsWonCardTest();

      expect(screen.getByText('Won 2 markets')).toBeOnTheScreen();
      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();
    });

    it('renders singular form when numberOfMarketsWon is 1', () => {
      setupMarketsWonCardTest({ numberOfMarketsWon: 1 });

      expect(screen.getByText('Won 1 market')).toBeOnTheScreen();
    });

    it('renders plural form when numberOfMarketsWon is greater than 1', () => {
      renderWithProvider(
        <MarketsWonCard {...createDefaultProps()} numberOfMarketsWon={5} />,
      );

      expect(screen.getByText('Won 5 markets')).toBeOnTheScreen();
    });

    it('does not show won markets row when numberOfMarketsWon is 0', () => {
      renderWithProvider(
        <MarketsWonCard {...createDefaultProps()} numberOfMarketsWon={0} />,
      );

      expect(screen.queryByText('Won 0 markets')).not.toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('renders the unrealized P&L row always', () => {
      setupMarketsWonCardTest();

      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('+$8.63 (+3.9%)')).toBeOnTheScreen();
    });

    it('does not show won markets row when numberOfMarketsWon is undefined', () => {
      const { numberOfMarketsWon, ...propsWithoutWon } = createDefaultProps();
      setupMarketsWonCardTest({
        ...propsWithoutWon,
        numberOfMarketsWon: undefined,
      });

      expect(screen.queryByText(/Won \d+ markets/)).not.toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('shows claim button only when totalClaimableAmount and onClaimPress are provided', () => {
      setupMarketsWonCardTest();

      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();
    });

    it('does not show claim button when onClaimPress is not provided', () => {
      const { onClaimPress, ...propsWithoutCallback } = createDefaultProps();
      setupMarketsWonCardTest({
        ...propsWithoutCallback,
        onClaimPress: undefined,
      });

      expect(screen.queryByText('Claim $45.20')).not.toBeOnTheScreen();
    });

    it('renders claim button correctly with loading states', () => {
      // Test loading state
      setupMarketsWonCardTest({ isLoading: true });

      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();

      // Test non-loading state
      setupMarketsWonCardTest({ isLoading: false });

      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();
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

    it('formats claimable amount to 2 decimal places', () => {
      setupMarketsWonCardTest({ totalClaimableAmount: 123.456 });

      expect(screen.getByText('Claim $123.46')).toBeOnTheScreen();
    });

    it('handles zero claimable amount correctly', () => {
      setupMarketsWonCardTest({ totalClaimableAmount: 0 });

      expect(screen.getByText('Claim $0.00')).toBeOnTheScreen();
    });
  });

  describe('Conditional Rendering Logic', () => {
    it('shows won markets row when numberOfMarketsWon is greater than 0', () => {
      setupMarketsWonCardTest({ numberOfMarketsWon: 5 });

      expect(screen.getByText('Won 5 markets')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('hides won markets row when numberOfMarketsWon is 0', () => {
      setupMarketsWonCardTest({ numberOfMarketsWon: 0 });

      expect(screen.queryByText(/Won \d+ markets/)).not.toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('hides won markets row when numberOfMarketsWon is undefined', () => {
      const { numberOfMarketsWon, ...propsWithoutWon } = createDefaultProps();
      setupMarketsWonCardTest({
        ...propsWithoutWon,
        numberOfMarketsWon: undefined,
      });

      expect(screen.queryByText(/Won \d+ markets/)).not.toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('always shows unrealized P&L row regardless of other props', () => {
      setupMarketsWonCardTest(
        {},
        {
          unrealizedPnL: {
            user: '0x1234567890123456789012345678901234567890',
            cashUpnl: 100,
            percentUpnl: 10,
          },
        },
      );

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
        {},
        {
          isFetching: true,
          unrealizedPnL: null,
        },
      );

      expect(screen.getByTestId('unrealized-pnl-skeleton')).toBeOnTheScreen();
    });

    it('handles error state from hook', () => {
      setupMarketsWonCardTest(
        {},
        {
          error: 'Failed to fetch unrealized P&L',
          unrealizedPnL: null,
        },
      );

      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      // Should show fallback values when there's an error
      expect(screen.getByText('+$0.00 (+0.0%)')).toBeOnTheScreen();
    });

    it('handles null unrealized P&L data gracefully', () => {
      setupMarketsWonCardTest(
        {},
        {
          unrealizedPnL: null,
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

      // Claim button shows ActivityIndicator while hook shows skeleton (Icon hidden)
      expect(screen.queryByText('ArrowRight')).not.toBeOnTheScreen();
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
  });
});
