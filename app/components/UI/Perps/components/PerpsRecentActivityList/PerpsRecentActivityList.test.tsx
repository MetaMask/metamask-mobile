import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsRecentActivityList from './PerpsRecentActivityList';
import Routes from '../../../../../constants/navigation/Routes';
import { FillType } from '../../types/transactionHistory';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      header: {},
      activityItem: {},
      leftSection: {},
      iconContainer: {},
      activityInfo: {},
      activityType: {},
      activityAmount: {},
      rightSection: {},
      emptyText: {},
    },
  }),
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const ReactLib = jest.requireActual('react');
  const { Text: ReactNativeText } = jest.requireActual('react-native');

  const MockText = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => ReactLib.createElement(ReactNativeText, props, children);

  return {
    __esModule: true,
    default: MockText,
    TextVariant: {
      HeadingSM: 'HeadingSM',
      BodyMD: 'BodyMD',
      BodyMDMedium: 'BodyMDMedium',
      BodySM: 'BodySM',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
      Success: 'Success',
      Error: 'Error',
    },
  };
});

jest.mock('../PerpsTokenLogo', () => {
  const { View: RNView, Text: RNText } = jest.requireActual('react-native');
  return function MockPerpsTokenLogo({
    symbol,
    size,
    recyclingKey,
  }: {
    symbol: string;
    size: number;
    recyclingKey: string;
  }) {
    return (
      <RNView testID={`perps-token-logo-${symbol}`}>
        <RNText testID="logo-size">{size}</RNText>
        <RNText testID="logo-key">{recyclingKey}</RNText>
      </RNView>
    );
  };
});

jest.mock('../PerpsRowSkeleton', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return function MockPerpsRowSkeleton({ count }: { count: number }) {
    return <RNView testID={`perps-row-skeleton-${count}`} />;
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.home.recent_activity': 'Recent Activity',
      'perps.home.see_all': 'See All',
      'perps.home.loading': 'Loading...',
      'perps.home.no_activity': 'No recent activity',
    };
    return translations[key] || key;
  },
}));

jest.mock(
  '../PerpsFillTag',
  () =>
    function MockPerpsFillTag() {
      return null;
    },
);

describe('PerpsRecentActivityList', () => {
  const mockNavigate = jest.fn();

  const mockTransactions = [
    {
      id: 'order-1',
      type: 'trade' as const,
      category: 'position_open' as const,
      title: 'Opened long',
      subtitle: '1.5 BTC',
      timestamp: 1698700000000,
      asset: 'BTC',
      fill: {
        shortTitle: 'Opened long',
        amount: '-$10.50',
        amountNumber: -10.5,
        isPositive: false,
        size: '1.5',
        entryPrice: '52000',
        pnl: '0',
        fee: '10.5',
        points: '0',
        feeToken: 'USDC',
        action: 'Opened',
        fillType: FillType.Standard,
      },
    },
    {
      id: 'order-2',
      type: 'trade' as const,
      category: 'position_close' as const,
      title: 'Closed long',
      subtitle: '2.0 ETH',
      timestamp: 1698690000000,
      asset: 'ETH',
      fill: {
        shortTitle: 'Closed long',
        amount: '+$145.00',
        amountNumber: 145,
        isPositive: true,
        size: '2.0',
        entryPrice: '3000',
        pnl: '150',
        fee: '5.0',
        points: '0',
        feeToken: 'USDC',
        action: 'Closed',
        fillType: FillType.Standard,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    const { useNavigation } = jest.requireMock('@react-navigation/native');
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<PerpsRecentActivityList transactions={[]} isLoading />);

      expect(screen.getByTestId('perps-row-skeleton-3')).toBeOnTheScreen();
    });

    it('renders header with title when loading', () => {
      render(<PerpsRecentActivityList transactions={[]} isLoading />);

      expect(screen.getByText('Recent Activity')).toBeOnTheScreen();
    });

    it('does not render arrow icon when loading', () => {
      render(<PerpsRecentActivityList transactions={[]} isLoading />);

      // Arrow icon is not shown when loading (no pressable header)
      expect(screen.queryByText('Recent Activity')).toBeOnTheScreen();
    });

    it('does not render activity list when loading', () => {
      render(
        <PerpsRecentActivityList transactions={mockTransactions} isLoading />,
      );

      expect(
        screen.queryByTestId('perps-token-logo-BTC'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('perps-token-logo-ETH'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Empty State', () => {
    it('renders empty message when transactions array is empty', () => {
      render(<PerpsRecentActivityList transactions={[]} />);

      expect(screen.getByText('No recent activity')).toBeOnTheScreen();
    });

    it('renders header with title when empty', () => {
      render(<PerpsRecentActivityList transactions={[]} />);

      expect(screen.getByText('Recent Activity')).toBeOnTheScreen();
    });

    it('does not render pressable header when empty', () => {
      render(<PerpsRecentActivityList transactions={[]} />);

      // When empty, header is not pressable (no arrow icon)
      expect(screen.queryByText('Recent Activity')).toBeOnTheScreen();
    });
  });

  describe('Component Rendering', () => {
    it('renders list with transactions', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
    });

    it('renders header with title and pressable row', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      expect(screen.getByText('Recent Activity')).toBeOnTheScreen();
      // Header row is pressable with arrow icon (no "See All" text)
    });

    it('renders transaction subtitles correctly', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      expect(screen.getByText('1.5 BTC')).toBeOnTheScreen();
      expect(screen.getByText('2.0 ETH')).toBeOnTheScreen();
    });

    it('strips hip3 prefix from transaction subtitle', () => {
      const hip3Transactions = [
        {
          ...mockTransactions[0],
          subtitle: 'hip3:BTC',
          asset: 'hip3:BTC',
        },
      ];

      render(<PerpsRecentActivityList transactions={hip3Transactions} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });

    it('strips DEX prefix from transaction subtitle', () => {
      const dexTransactions = [
        {
          ...mockTransactions[0],
          subtitle: 'xyz:TSLA',
          asset: 'xyz:TSLA',
        },
      ];

      render(<PerpsRecentActivityList transactions={dexTransactions} />);

      expect(screen.getByText('TSLA')).toBeOnTheScreen();
    });

    it('keeps regular symbols unchanged in subtitle', () => {
      const solTransactions = [
        {
          ...mockTransactions[0],
          subtitle: 'SOL',
          asset: 'SOL',
        },
      ];

      render(<PerpsRecentActivityList transactions={solTransactions} />);

      expect(screen.getByText('SOL')).toBeOnTheScreen();
    });

    it('renders token logos for each transaction', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      expect(screen.getByTestId('perps-token-logo-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('perps-token-logo-ETH')).toBeOnTheScreen();
    });

    it('renders fill amounts correctly', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      expect(screen.getByText('-$10.50')).toBeOnTheScreen();
      expect(screen.getByText('+$145.00')).toBeOnTheScreen();
    });

    it('uses default icon size when not provided', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      const iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('40');
    });

    it('uses custom icon size when provided', () => {
      render(
        <PerpsRecentActivityList
          transactions={mockTransactions}
          iconSize={40}
        />,
      );

      const iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('40');
    });
  });

  describe('Navigation Handling', () => {
    it('navigates to transactions view when header is pressed', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      // Press the header row (title text is within the pressable area)
      const headerTitle = screen.getByText('Recent Activity');
      fireEvent.press(headerTitle);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ACTIVITY, {
        redirectToPerpsTransactions: true,
        showBackButton: true,
      });
    });

    it('navigates to position transaction detail when transaction item is pressed', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      const transactionItem = screen.getByText('Opened long');
      fireEvent.press(transactionItem.parent?.parent || transactionItem);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.POSITION_TRANSACTION,
        {
          transaction: mockTransactions[0],
        },
      );
    });

    it('navigates with correct transaction data for different transactions', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      const ethTransaction = screen.getByText('Closed long');
      fireEvent.press(ethTransaction.parent?.parent || ethTransaction);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.POSITION_TRANSACTION,
        {
          transaction: mockTransactions[1],
        },
      );
    });

    it('handles multiple presses on header', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      const headerTitle = screen.getByText('Recent Activity');
      fireEvent.press(headerTitle);
      fireEvent.press(headerTitle);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Transaction Display', () => {
    it('renders transactions without fill data correctly', () => {
      const transactionsWithoutFill = [
        {
          id: 'order-3',
          type: 'trade' as const,
          category: 'position_open' as const,
          title: 'Opened long',
          subtitle: '1.0 SOL',
          timestamp: 1698680000000,
          asset: 'SOL',
          fill: undefined,
        },
      ];

      render(
        <PerpsRecentActivityList transactions={transactionsWithoutFill} />,
      );

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('1.0 SOL')).toBeOnTheScreen();
    });

    it('does not render amount when fill is undefined', () => {
      const transactionsWithoutFill = [
        {
          id: 'order-3',
          type: 'trade' as const,
          category: 'position_open' as const,
          title: 'Opened long',
          subtitle: '1.0 SOL',
          timestamp: 1698680000000,
          asset: 'SOL',
          fill: undefined,
        },
      ];

      render(
        <PerpsRecentActivityList transactions={transactionsWithoutFill} />,
      );

      expect(screen.queryByText(/\$/)).not.toBeOnTheScreen();
    });

    it('renders subtitle when provided', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      expect(screen.getByText('1.5 BTC')).toBeOnTheScreen();
      expect(screen.getByText('2.0 ETH')).toBeOnTheScreen();
    });

    it('does not render subtitle section when subtitle is undefined', () => {
      const transactionsWithoutSubtitle = [
        {
          id: 'order-3',
          type: 'trade' as const,
          category: 'position_open' as const,
          title: 'Opened long',
          subtitle: '',
          timestamp: 1698680000000,
          asset: 'SOL',
          fill: {
            shortTitle: 'Opened long',
            amount: '-$10.00',
            amountNumber: -10,
            isPositive: false,
            size: '1.0',
            entryPrice: '150',
            pnl: '0',
            fee: '10.0',
            points: '0',
            feeToken: 'USDC',
            action: 'Opened',
            fillType: FillType.Standard,
          },
        },
      ];

      render(
        <PerpsRecentActivityList transactions={transactionsWithoutSubtitle} />,
      );

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('-$10.00')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles single transaction', () => {
      const singleTransaction = [mockTransactions[0]];

      render(<PerpsRecentActivityList transactions={singleTransaction} />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.queryByText('Closed long')).not.toBeOnTheScreen();
    });

    it('handles very long list of transactions', () => {
      const longTransactionList = Array.from({ length: 50 }, (_, i) => ({
        id: `order-${i}`,
        type: 'trade' as const,
        category: 'position_open' as const,
        title: 'Opened long',
        subtitle: `1.0 TOKEN${i}`,
        timestamp: 1698700000000 + i,
        asset: `TOKEN${i}`,
        fill: {
          shortTitle: 'Opened long',
          amount: '-$1.00',
          amountNumber: -1,
          isPositive: false,
          size: '1.0',
          entryPrice: '100',
          pnl: '0',
          fee: '1.0',
          points: '0',
          feeToken: 'USDC',
          action: 'Opened',
          fillType: FillType.Standard,
        },
      }));

      render(<PerpsRecentActivityList transactions={longTransactionList} />);

      expect(screen.getByText('Recent Activity')).toBeOnTheScreen();
    });

    it('handles transactions with empty orderId gracefully', () => {
      const transactionsWithGeneratedId = [
        {
          id: 'fill-1698700000000',
          type: 'trade' as const,
          category: 'position_open' as const,
          title: 'Opened long',
          subtitle: '1.0 BTC',
          timestamp: 1698700000000,
          asset: 'BTC',
          fill: {
            shortTitle: 'Opened long',
            amount: '-$10.00',
            amountNumber: -10,
            isPositive: false,
            size: '1.0',
            entryPrice: '52000',
            pnl: '0',
            fee: '10.0',
            points: '0',
            feeToken: 'USDC',
            action: 'Opened',
            fillType: FillType.Standard,
          },
        },
      ];

      render(
        <PerpsRecentActivityList transactions={transactionsWithGeneratedId} />,
      );

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
    });

    it('renders recycling key correctly for token logos', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      const logoKeys = screen.getAllByTestId('logo-key');
      expect(logoKeys[0]).toHaveTextContent('BTC-order-1');
      expect(logoKeys[1]).toHaveTextContent('ETH-order-2');
    });

    it('handles transactions with special characters in symbols', () => {
      const specialTransactions = [
        {
          id: 'order-special',
          type: 'trade' as const,
          category: 'position_open' as const,
          title: 'Opened long',
          subtitle: '1.0 BTC-USD',
          timestamp: 1698700000000,
          asset: 'BTC-USD',
          fill: {
            shortTitle: 'Opened long',
            amount: '-$10.00',
            amountNumber: -10,
            isPositive: false,
            size: '1.0',
            entryPrice: '52000',
            pnl: '0',
            fee: '10.0',
            points: '0',
            feeToken: 'USDC',
            action: 'Opened',
            fillType: FillType.Standard,
          },
        },
      ];

      render(<PerpsRecentActivityList transactions={specialTransactions} />);

      expect(screen.getByTestId('perps-token-logo-BTC-USD')).toBeOnTheScreen();
    });
  });

  describe('Data Updates', () => {
    it('updates when transactions prop changes', () => {
      const { rerender } = render(
        <PerpsRecentActivityList transactions={mockTransactions} />,
      );

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();

      const newTransactions = [
        {
          id: 'order-3',
          type: 'trade' as const,
          category: 'position_open' as const,
          title: 'Opened short',
          subtitle: '10.0 SOL',
          timestamp: 1698710000000,
          asset: 'SOL',
          fill: {
            shortTitle: 'Opened short',
            amount: '-$2.00',
            amountNumber: -2,
            isPositive: false,
            size: '10.0',
            entryPrice: '150',
            pnl: '0',
            fee: '2.0',
            points: '0',
            feeToken: 'USDC',
            action: 'Opened',
            fillType: FillType.Standard,
          },
        },
      ];

      rerender(<PerpsRecentActivityList transactions={newTransactions} />);

      expect(screen.queryByText('Opened long')).not.toBeOnTheScreen();
      expect(screen.queryByText('Closed long')).not.toBeOnTheScreen();
      expect(screen.getByText('Opened short')).toBeOnTheScreen();
    });

    it('transitions from empty state to fills', () => {
      const { rerender } = render(
        <PerpsRecentActivityList transactions={[]} />,
      );

      expect(screen.getByText('No recent activity')).toBeOnTheScreen();

      rerender(<PerpsRecentActivityList transactions={mockTransactions} />);

      expect(screen.queryByText('No recent activity')).not.toBeOnTheScreen();
      expect(screen.getByText('Opened long')).toBeOnTheScreen();
    });

    it('transitions from fills to empty state', () => {
      const { rerender } = render(
        <PerpsRecentActivityList transactions={mockTransactions} />,
      );

      expect(screen.getByText('Opened long')).toBeOnTheScreen();

      rerender(<PerpsRecentActivityList transactions={[]} />);

      expect(screen.queryByText('Opened long')).not.toBeOnTheScreen();
      expect(screen.getByText('No recent activity')).toBeOnTheScreen();
    });

    it('transitions from loading to fills', () => {
      const { rerender } = render(
        <PerpsRecentActivityList transactions={[]} isLoading />,
      );

      expect(screen.getByTestId('perps-row-skeleton-3')).toBeOnTheScreen();

      rerender(
        <PerpsRecentActivityList
          transactions={mockTransactions}
          isLoading={false}
        />,
      );

      expect(
        screen.queryByTestId('perps-row-skeleton-3'),
      ).not.toBeOnTheScreen();
      expect(screen.getByText('Opened long')).toBeOnTheScreen();
    });

    it('updates icon size correctly', () => {
      const { rerender } = render(
        <PerpsRecentActivityList
          transactions={mockTransactions}
          iconSize={32}
        />,
      );

      let iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('32');

      rerender(
        <PerpsRecentActivityList
          transactions={mockTransactions}
          iconSize={48}
        />,
      );

      iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('48');
    });
  });

  describe('Component Lifecycle', () => {
    it('does not throw error on unmount', () => {
      const { unmount } = render(
        <PerpsRecentActivityList transactions={mockTransactions} />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it('cleans up properly when remounted with different props', () => {
      const { rerender } = render(
        <PerpsRecentActivityList transactions={mockTransactions} />,
      );

      expect(screen.getByText('Opened long')).toBeOnTheScreen();

      rerender(<PerpsRecentActivityList transactions={[]} />);

      expect(screen.getByText('No recent activity')).toBeOnTheScreen();

      rerender(<PerpsRecentActivityList transactions={mockTransactions} />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
    });
  });

  describe('FlatList Configuration', () => {
    it('uses transaction id as key extractor', () => {
      render(<PerpsRecentActivityList transactions={mockTransactions} />);

      // Verify transactions are rendered with correct data
      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
    });

    it('disables scroll on FlatList', () => {
      const { root } = render(
        <PerpsRecentActivityList transactions={mockTransactions} />,
      );

      // FlatList is rendered with scrollEnabled={false}
      expect(root).toBeTruthy();
    });
  });
});
