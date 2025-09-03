import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PerpsMarketTabs from './PerpsMarketTabs';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsMarketTabsSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import type { Position, Order } from '../../controllers/types';
import type { PerpsMarketTabsProps } from './PerpsMarketTabs.types';

// Mock hooks
jest.mock('../../hooks/usePerpsMarketStats', () => ({
  usePerpsMarketStats: () => ({
    currentPrice: '$45,000.00',
    priceChange24h: '+$1,125.00',
    high24h: '$46,000.00',
    low24h: '$44,000.00',
    volume24h: '$1.23B',
    openInterest: '$500M',
    fundingRate: '+0.01%',
    fundingCountdown: '5h 30m',
    refresh: jest.fn(),
  }),
}));

// Mock components
jest.mock('../PerpsMarketStatisticsCard', () => ({
  __esModule: true,
  default: ({ onTooltipPress }: { onTooltipPress: (key: string) => void }) => {
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <View testID="perps-market-statistics-card">
        <TouchableOpacity
          onPress={() => onTooltipPress('openInterest')}
          testID="statistics-tooltip-trigger"
        />
      </View>
    );
  },
}));

jest.mock('../PerpsPositionCard', () => ({
  __esModule: true,
  default: ({
    onPositionUpdate,
  }: {
    onPositionUpdate?: () => Promise<void>;
  }) => {
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <View testID="perps-position-card">
        <TouchableOpacity
          onPress={onPositionUpdate}
          testID="position-update-trigger"
        />
      </View>
    );
  },
}));

jest.mock('../PerpsOpenOrderCard', () => ({
  __esModule: true,
  default: ({
    order,
    onCancel,
  }: {
    order: { orderId: string };
    onCancel?: (order: { orderId: string }) => Promise<void>;
  }) => {
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <View testID="perps-open-order-card">
        <TouchableOpacity
          onPress={() => onCancel?.(order)}
          testID="order-cancel-trigger"
        />
      </View>
    );
  },
}));

jest.mock('../PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: ({
    isVisible,
    onClose,
  }: {
    isVisible: boolean;
    onClose: () => void;
  }) => {
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return isVisible ? (
      <View testID="perps-bottom-sheet-tooltip">
        <TouchableOpacity onPress={onClose} testID="tooltip-close" />
      </View>
    ) : null;
  },
}));

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      cancelOrder: jest.fn().mockResolvedValue({}),
    },
  },
}));

const mockMarketStats: PerpsMarketTabsProps['marketStats'] = {
  currentPrice: 45000,
  priceChange24h: 1125,
  high24h: '$46,000.00',
  low24h: '$44,000.00',
  volume24h: '$1.23B',
  openInterest: '$500M',
  fundingRate: '+0.01%',
  fundingCountdown: '5h 30m',
  isLoading: false,
  refresh: jest.fn(),
};

const mockPosition: Position = {
  coin: 'BTC',
  size: '0.5',
  entryPrice: '44000',
  positionValue: '22500',
  unrealizedPnl: '500',
  marginUsed: '1000',
  leverage: {
    type: 'isolated',
    value: 5,
  },
  liquidationPrice: '40000',
  maxLeverage: 20,
  returnOnEquity: '2.22',
  cumulativeFunding: {
    allTime: '0',
    sinceOpen: '0',
    sinceChange: '0',
  },
};

const mockOrder: Order = {
  orderId: 'order-1',
  symbol: 'BTC',
  side: 'buy',
  size: '0.1',
  originalSize: '0.1',
  filledSize: '0',
  remainingSize: '0.1',
  price: '46000',
  orderType: 'limit',
  status: 'open',
  timestamp: Date.now(),
  lastUpdated: Date.now(),
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PerpsMarketTabs', () => {
  const defaultProps: PerpsMarketTabsProps = {
    marketStats: mockMarketStats,
    position: null,
    isLoadingPosition: false,
    unfilledOrders: [],
  };

  it('renders loading skeleton when isLoadingPosition is true', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs {...defaultProps} isLoadingPosition />,
      { state: initialState },
    );

    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.SKELETON_TAB_BAR),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.SKELETON_CONTENT),
    ).toBeTruthy();
  });

  it('renders statistics-only view when no position and no orders', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs {...defaultProps} />,
      { state: initialState },
    );

    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_ONLY_TITLE),
    ).toBeTruthy();
    expect(getByTestId('perps-market-statistics-card')).toBeTruthy();
  });

  it('renders tabs when position exists', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs {...defaultProps} position={mockPosition} />,
      { state: initialState },
    );

    expect(getByTestId(PerpsMarketTabsSelectorsIDs.CONTAINER)).toBeTruthy();
    expect(getByTestId(PerpsMarketTabsSelectorsIDs.TAB_BAR)).toBeTruthy();
    expect(getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_TAB)).toBeTruthy();
    expect(getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_TAB)).toBeTruthy();
    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_TAB),
    ).toBeTruthy();
  });

  it('switches tabs correctly', () => {
    const onActiveTabChange = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs
        {...defaultProps}
        position={mockPosition}
        onActiveTabChange={onActiveTabChange}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_TAB));
    expect(onActiveTabChange).toHaveBeenCalledWith('statistics');

    fireEvent.press(getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_TAB));
    expect(onActiveTabChange).toHaveBeenCalledWith('orders');
  });

  it('renders position content in position tab', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs {...defaultProps} position={mockPosition} />,
      { state: initialState },
    );

    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
    ).toBeTruthy();
    expect(getByTestId('perps-position-card')).toBeTruthy();
  });

  it('renders statistics content in statistics tab', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs {...defaultProps} position={mockPosition} />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_TAB));
    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT),
    ).toBeTruthy();
    expect(getByTestId('perps-market-statistics-card')).toBeTruthy();
  });

  it('renders empty state in orders tab when no orders', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs {...defaultProps} position={mockPosition} />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_TAB));
    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_EMPTY_STATE),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_EMPTY_ICON),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_EMPTY_TEXT),
    ).toBeTruthy();
  });

  it('renders order cards when orders exist', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs
        {...defaultProps}
        position={mockPosition}
        unfilledOrders={[mockOrder]}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_TAB));
    expect(
      getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
    ).toBeTruthy();
    expect(getByTestId('perps-open-order-card')).toBeTruthy();
  });

  it('shows tooltip when tooltip is triggered', async () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs {...defaultProps} />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('statistics-tooltip-trigger'));

    await waitFor(() => {
      expect(getByTestId('perps-bottom-sheet-tooltip')).toBeTruthy();
    });
  });

  it('closes tooltip when close is pressed', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PerpsMarketTabs {...defaultProps} />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('statistics-tooltip-trigger'));
    await waitFor(() => {
      expect(getByTestId('perps-bottom-sheet-tooltip')).toBeTruthy();
    });

    fireEvent.press(getByTestId('tooltip-close'));
    await waitFor(() => {
      expect(queryByTestId('perps-bottom-sheet-tooltip')).toBeNull();
    });
  });

  it('calls onPositionUpdate when position update is triggered', () => {
    const onPositionUpdate = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs
        {...defaultProps}
        position={mockPosition}
        onPositionUpdate={onPositionUpdate}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('position-update-trigger'));
    expect(onPositionUpdate).toHaveBeenCalled();
  });

  it('calls Engine.context.PerpsController.cancelOrder when order cancel is triggered', async () => {
    const Engine = jest.requireMock('../../../../../core/Engine');
    const mockCancelOrder = Engine.context.PerpsController.cancelOrder;

    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs
        {...defaultProps}
        position={mockPosition}
        unfilledOrders={[mockOrder]}
      />,
      { state: initialState },
    );

    // Switch to orders tab to see the order cards
    fireEvent.press(getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_TAB));

    // Trigger the cancel action on the order card
    fireEvent.press(getByTestId('order-cancel-trigger'));

    // Wait for the async cancelOrder call
    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalledWith({
        orderId: mockOrder.orderId,
        coin: mockOrder.symbol,
      });
    });
  });

  it('handles error when order cancellation fails', async () => {
    const Engine = jest.requireMock('../../../../../core/Engine');
    const mockCancelOrder = Engine.context.PerpsController.cancelOrder;

    // Mock the cancelOrder to reject
    mockCancelOrder.mockRejectedValueOnce(new Error('Cancellation failed'));

    const { getByTestId } = renderWithProvider(
      <PerpsMarketTabs
        {...defaultProps}
        position={mockPosition}
        unfilledOrders={[mockOrder]}
      />,
      { state: initialState },
    );

    // Switch to orders tab
    fireEvent.press(getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_TAB));

    // Trigger the cancel action
    fireEvent.press(getByTestId('order-cancel-trigger'));

    // Wait for the async call to complete
    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalledWith({
        orderId: mockOrder.orderId,
        coin: mockOrder.symbol,
      });
    });

    // Reset the mock for other tests
    mockCancelOrder.mockResolvedValue({});
  });
});
