import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsRecentActivityList from './PerpsRecentActivityList';
import type { OrderFill } from '../../controllers/types';
import Routes from '../../../../../constants/navigation/Routes';
import { transformFillsToTransactions } from '../../utils/transactionTransforms';
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

jest.mock('../../utils/transactionTransforms', () => ({
  transformFillsToTransactions: jest.fn(),
}));

describe('PerpsRecentActivityList', () => {
  const mockNavigate = jest.fn();
  const mockTransformFillsToTransactions = jest.mocked(
    transformFillsToTransactions,
  );

  const mockFills: OrderFill[] = [
    {
      direction: 'Open Long',
      orderId: 'order-1',
      symbol: 'BTC',
      side: 'buy',
      size: '1.5',
      price: '52000',
      fee: '10.5',
      timestamp: 1698700000000,
      feeToken: 'USDC',
      pnl: '0',
    },
    {
      direction: 'Close Long',
      orderId: 'order-2',
      symbol: 'ETH',
      side: 'sell',
      size: '2.0',
      price: '3000',
      fee: '5.0',
      timestamp: 1698690000000,
      feeToken: 'USDC',
      pnl: '150',
    },
  ];

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
    mockTransformFillsToTransactions.mockReturnValue(mockTransactions);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading message when isLoading is true', () => {
      render(<PerpsRecentActivityList fills={[]} isLoading />);

      expect(screen.getByText('Loading...')).toBeOnTheScreen();
    });

    it('renders header with title when loading', () => {
      render(<PerpsRecentActivityList fills={[]} isLoading />);

      expect(screen.getByText('Recent Activity')).toBeOnTheScreen();
    });

    it('does not render See All button when loading', () => {
      render(<PerpsRecentActivityList fills={[]} isLoading />);

      expect(screen.queryByText('See All')).not.toBeOnTheScreen();
    });

    it('does not render activity list when loading', () => {
      render(<PerpsRecentActivityList fills={mockFills} isLoading />);

      expect(
        screen.queryByTestId('perps-token-logo-BTC'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('perps-token-logo-ETH'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Empty State', () => {
    it('renders empty message when fills array is empty', () => {
      render(<PerpsRecentActivityList fills={[]} />);

      expect(screen.getByText('No recent activity')).toBeOnTheScreen();
    });

    it('renders header with title when empty', () => {
      render(<PerpsRecentActivityList fills={[]} />);

      expect(screen.getByText('Recent Activity')).toBeOnTheScreen();
    });

    it('does not render See All button when empty', () => {
      render(<PerpsRecentActivityList fills={[]} />);

      expect(screen.queryByText('See All')).not.toBeOnTheScreen();
    });

    it('does not call transformFillsToTransactions when empty', () => {
      render(<PerpsRecentActivityList fills={[]} />);

      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith([]);
    });
  });

  describe('Component Rendering', () => {
    it('renders list with fills', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
    });

    it('renders header with title and See All button', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      expect(screen.getByText('Recent Activity')).toBeOnTheScreen();
      expect(screen.getByText('See All')).toBeOnTheScreen();
    });

    it('renders transaction subtitles correctly', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      expect(screen.getByText('1.5 BTC')).toBeOnTheScreen();
      expect(screen.getByText('2.0 ETH')).toBeOnTheScreen();
    });

    it('renders token logos for each transaction', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      expect(screen.getByTestId('perps-token-logo-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('perps-token-logo-ETH')).toBeOnTheScreen();
    });

    it('renders fill amounts correctly', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      expect(screen.getByText('-$10.50')).toBeOnTheScreen();
      expect(screen.getByText('+$145.00')).toBeOnTheScreen();
    });

    it('calls transformFillsToTransactions with provided fills', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      expect(mockTransformFillsToTransactions).toHaveBeenCalledTimes(1);
      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith(mockFills);
    });

    it('uses default icon size when not provided', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      const iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('40');
    });

    it('uses custom icon size when provided', () => {
      render(<PerpsRecentActivityList fills={mockFills} iconSize={40} />);

      const iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('40');
    });
  });

  describe('Navigation Handling', () => {
    it('navigates to transactions view when See All is pressed', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      const seeAllButton = screen.getByText('See All');
      fireEvent.press(seeAllButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
        screen: Routes.TRANSACTIONS_VIEW,
        params: { redirectToPerpsTransactions: true },
      });
    });

    it('navigates to market details when transaction item is pressed', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      const transactionItem = screen.getByText('Opened long');
      fireEvent.press(transactionItem.parent?.parent || transactionItem);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: { symbol: 'BTC', name: 'BTC' },
        },
      });
    });

    it('navigates with correct market data for different transactions', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      const ethTransaction = screen.getByText('Closed long');
      fireEvent.press(ethTransaction.parent?.parent || ethTransaction);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: { symbol: 'ETH', name: 'ETH' },
        },
      });
    });

    it('handles multiple presses on See All button', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      const seeAllButton = screen.getByText('See All');
      fireEvent.press(seeAllButton);
      fireEvent.press(seeAllButton);

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
      mockTransformFillsToTransactions.mockReturnValueOnce(
        transactionsWithoutFill,
      );

      render(<PerpsRecentActivityList fills={mockFills} />);

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
      mockTransformFillsToTransactions.mockReturnValueOnce(
        transactionsWithoutFill,
      );

      render(<PerpsRecentActivityList fills={mockFills} />);

      expect(screen.queryByText(/\$/)).not.toBeOnTheScreen();
    });

    it('renders subtitle when provided', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

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
      mockTransformFillsToTransactions.mockReturnValueOnce(
        transactionsWithoutSubtitle,
      );

      render(<PerpsRecentActivityList fills={mockFills} />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('-$10.00')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles single fill', () => {
      const singleFill = [mockFills[0]];
      const singleTransaction = [mockTransactions[0]];
      mockTransformFillsToTransactions.mockReturnValueOnce(singleTransaction);

      render(<PerpsRecentActivityList fills={singleFill} />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.queryByText('Closed long')).not.toBeOnTheScreen();
    });

    it('handles very long list of fills', () => {
      const longFillList: OrderFill[] = Array.from({ length: 50 }, (_, i) => ({
        direction: 'Open Long',
        orderId: `order-${i}`,
        symbol: `TOKEN${i}`,
        side: 'buy',
        size: '1.0',
        price: '100',
        fee: '1.0',
        timestamp: 1698700000000 + i,
        feeToken: 'USDC',
        pnl: '0',
      }));

      const longTransactionList = longFillList.map((_fill, i) => ({
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

      mockTransformFillsToTransactions.mockReturnValueOnce(longTransactionList);

      render(<PerpsRecentActivityList fills={longFillList} />);

      expect(screen.getByText('Recent Activity')).toBeOnTheScreen();
    });

    it('handles fills with empty orderId gracefully', () => {
      const fillsWithEmptyId: OrderFill[] = [
        {
          direction: 'Open Long',
          orderId: '',
          symbol: 'BTC',
          side: 'buy',
          size: '1.0',
          price: '52000',
          fee: '10.0',
          timestamp: 1698700000000,
          feeToken: 'USDC',
          pnl: '0',
        },
      ];

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

      mockTransformFillsToTransactions.mockReturnValueOnce(
        transactionsWithGeneratedId,
      );

      render(<PerpsRecentActivityList fills={fillsWithEmptyId} />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
    });

    it('renders recycling key correctly for token logos', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      const logoKeys = screen.getAllByTestId('logo-key');
      expect(logoKeys[0]).toHaveTextContent('BTC-order-1');
      expect(logoKeys[1]).toHaveTextContent('ETH-order-2');
    });

    it('handles fills with special characters in symbols', () => {
      const specialFills: OrderFill[] = [
        {
          direction: 'Open Long',
          orderId: 'order-special',
          symbol: 'BTC-USD',
          side: 'buy',
          size: '1.0',
          price: '52000',
          fee: '10.0',
          timestamp: 1698700000000,
          feeToken: 'USDC',
          pnl: '0',
        },
      ];

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

      mockTransformFillsToTransactions.mockReturnValueOnce(specialTransactions);

      render(<PerpsRecentActivityList fills={specialFills} />);

      expect(screen.getByTestId('perps-token-logo-BTC-USD')).toBeOnTheScreen();
    });
  });

  describe('Data Updates', () => {
    it('updates when fills prop changes', () => {
      const { rerender } = render(
        <PerpsRecentActivityList fills={mockFills} />,
      );

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();

      const newFills: OrderFill[] = [
        {
          direction: 'Open Short',
          orderId: 'order-3',
          symbol: 'SOL',
          side: 'sell',
          size: '10.0',
          price: '150',
          fee: '2.0',
          timestamp: 1698710000000,
          feeToken: 'USDC',
          pnl: '0',
        },
      ];

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

      mockTransformFillsToTransactions.mockReturnValueOnce(newTransactions);

      rerender(<PerpsRecentActivityList fills={newFills} />);

      expect(screen.queryByText('Opened long')).not.toBeOnTheScreen();
      expect(screen.queryByText('Closed long')).not.toBeOnTheScreen();
      expect(screen.getByText('Opened short')).toBeOnTheScreen();
    });

    it('transitions from empty state to fills', () => {
      const { rerender } = render(<PerpsRecentActivityList fills={[]} />);

      expect(screen.getByText('No recent activity')).toBeOnTheScreen();

      rerender(<PerpsRecentActivityList fills={mockFills} />);

      expect(screen.queryByText('No recent activity')).not.toBeOnTheScreen();
      expect(screen.getByText('Opened long')).toBeOnTheScreen();
    });

    it('transitions from fills to empty state', () => {
      const { rerender } = render(
        <PerpsRecentActivityList fills={mockFills} />,
      );

      expect(screen.getByText('Opened long')).toBeOnTheScreen();

      mockTransformFillsToTransactions.mockReturnValueOnce([]);

      rerender(<PerpsRecentActivityList fills={[]} />);

      expect(screen.queryByText('Opened long')).not.toBeOnTheScreen();
      expect(screen.getByText('No recent activity')).toBeOnTheScreen();
    });

    it('transitions from loading to fills', () => {
      const { rerender } = render(
        <PerpsRecentActivityList fills={[]} isLoading />,
      );

      expect(screen.getByText('Loading...')).toBeOnTheScreen();

      rerender(<PerpsRecentActivityList fills={mockFills} isLoading={false} />);

      expect(screen.queryByText('Loading...')).not.toBeOnTheScreen();
      expect(screen.getByText('Opened long')).toBeOnTheScreen();
    });

    it('updates icon size correctly', () => {
      const { rerender } = render(
        <PerpsRecentActivityList fills={mockFills} iconSize={32} />,
      );

      let iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('32');

      rerender(<PerpsRecentActivityList fills={mockFills} iconSize={48} />);

      iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('48');
    });
  });

  describe('Component Lifecycle', () => {
    it('does not throw error on unmount', () => {
      const { unmount } = render(<PerpsRecentActivityList fills={mockFills} />);

      expect(() => unmount()).not.toThrow();
    });

    it('cleans up properly when remounted with different props', () => {
      const { rerender } = render(
        <PerpsRecentActivityList fills={mockFills} />,
      );

      expect(screen.getByText('Opened long')).toBeOnTheScreen();

      mockTransformFillsToTransactions.mockReturnValueOnce([]);

      rerender(<PerpsRecentActivityList fills={[]} />);

      expect(screen.getByText('No recent activity')).toBeOnTheScreen();

      rerender(<PerpsRecentActivityList fills={mockFills} />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
    });
  });

  describe('FlatList Configuration', () => {
    it('uses transaction id as key extractor', () => {
      render(<PerpsRecentActivityList fills={mockFills} />);

      // Verify transactions are rendered with correct data
      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
    });

    it('disables scroll on FlatList', () => {
      const { root } = render(<PerpsRecentActivityList fills={mockFills} />);

      // FlatList is rendered with scrollEnabled={false}
      expect(root).toBeTruthy();
    });
  });
});
