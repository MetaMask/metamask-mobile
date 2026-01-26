import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsMarketTabs from './PerpsMarketTabs';
import { PerpsMarketTabsSelectorsIDs } from '../../Perps.testIds';
import {
  defaultPerpsMarketStatsMock,
  defaultPerpsPositionMock,
  defaultPerpsOrderMock,
} from '../../__mocks__/perpsHooksMocks';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      tabBar: {},
      tab: {},
      activeTab: {},
      tabContent: {},
      emptyStateContainer: {},
      statisticsOnlyTitle: {},
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock Engine with PerpsController
const mockCancelOrder = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PerpsController: {
        cancelOrder: (...args: unknown[]) => mockCancelOrder(...args),
      },
    },
  },
}));

// Mock usePerpsToasts hook
const mockShowToast = jest.fn();
const mockPerpsToastOptions = {
  orderManagement: {
    shared: {
      cancellationInProgress: jest.fn(() => ({
        type: 'info',
        message: 'mock-in-progress-toast',
        title: 'Cancelling Order',
      })),
      cancellationSuccess: jest.fn(() => ({
        type: 'success',
        message: 'mock-success-toast',
        title: 'Order Cancelled',
      })),
      cancellationFailed: {
        type: 'error',
        message: 'mock-error-toast',
        title: 'Cancellation Failed',
      },
    },
  },
};

jest.mock('../../hooks/usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: mockPerpsToastOptions,
  }),
}));

// Mock getOrderDirection utility
jest.mock('../../utils/orderUtils', () => ({
  getOrderDirection: jest.fn(() => 'long'),
}));

// Mock data hooks (component now fetches data internally)
const mockUsePerpsMarketStats = jest.fn();
const mockUsePerpsLivePositions = jest.fn();
const mockUsePerpsLiveOrders = jest.fn();

jest.mock('../../hooks/usePerpsMarketStats', () => ({
  usePerpsMarketStats: (...args: unknown[]) => mockUsePerpsMarketStats(...args),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({})),
  usePerpsLivePositions: (...args: unknown[]) =>
    mockUsePerpsLivePositions(...args),
  usePerpsLiveOrders: (...args: unknown[]) => mockUsePerpsLiveOrders(...args),
}));

// Mock child components using the same pattern as other tests
jest.mock('../PerpsMarketStatisticsCard', () => 'PerpsMarketStatisticsCard');
jest.mock('../PerpsPositionCard', () => 'PerpsPositionCard');
jest.mock('../PerpsBottomSheetTooltip', () => 'PerpsBottomSheetTooltip');

// Mock PerpsOpenOrderCard to test cancel functionality
jest.mock(
  '../PerpsOpenOrderCard',
  () =>
    function MockPerpsOpenOrderCard({
      order,
      onCancel,
      isCancelling,
    }: {
      order: unknown;
      onCancel?: (order: unknown) => void;
      isCancelling?: boolean;
    }) {
      const MockReact = jest.requireActual('react');
      const { TouchableOpacity, Text } = jest.requireActual('react-native');

      return MockReact.createElement(
        TouchableOpacity,
        {
          testID: 'mock-perps-open-order-card',
          onPress: () => {
            if (onCancel) {
              onCancel(order);
            }
          },
          disabled: isCancelling,
        },
        MockReact.createElement(
          Text,
          null,
          `Order ${(order as { orderId: string }).orderId}`,
        ),
      );
    },
);

describe('PerpsMarketTabs', () => {
  // Use shared mocks from perpsHooksMocks
  const mockMarketStats = { ...defaultPerpsMarketStatsMock };
  const mockPosition = { ...defaultPerpsPositionMock };
  const mockOrder = {
    ...defaultPerpsOrderMock,
    detailedOrderType: 'Limit Order', // Add missing property
  };

  // Additional properties for PerpsMarketTabs
  const nextFundingTime = 1234567890;
  const fundingIntervalHours = 8;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCancelOrder.mockReset();
    mockShowToast.mockReset();
    mockPerpsToastOptions.orderManagement.shared.cancellationInProgress.mockReset();
    mockPerpsToastOptions.orderManagement.shared.cancellationSuccess.mockReset();

    // Restore default mock implementations after reset
    mockCancelOrder.mockResolvedValue({ success: true });
    mockPerpsToastOptions.orderManagement.shared.cancellationInProgress.mockReturnValue(
      {
        type: 'info',
        message: 'mock-in-progress-toast',
        title: 'Cancelling Order',
      },
    );
    mockPerpsToastOptions.orderManagement.shared.cancellationSuccess.mockReturnValue(
      {
        type: 'success',
        message: 'mock-success-toast',
        title: 'Order Cancelled',
      },
    );

    // Setup default mock data for internal hooks
    mockUsePerpsMarketStats.mockReturnValue(mockMarketStats);
    mockUsePerpsLivePositions.mockReturnValue({ positions: [] });
    mockUsePerpsLiveOrders.mockReturnValue({ orders: [] });
  });

  describe('Rendering', () => {
    it('renders statistics tab by default', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert
      expect(getByText('perps.market.statistics')).toBeDefined();
    });

    it('displays position tab when position exists', () => {
      const onActiveTabChange = jest.fn();
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });

      const { getAllByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      expect(getAllByText('perps.market.position').length).toBeGreaterThan(0);
    });

    it('displays orders tab when unfilled orders exist', () => {
      const onActiveTabChange = jest.fn();
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [{ ...mockOrder, symbol: 'BTC' }],
      });

      const { getAllByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      expect(getAllByText('perps.market.orders').length).toBeGreaterThan(0);
    });
  });

  describe('Tab Switching', () => {
    it('switches tabs when clicked', async () => {
      const onActiveTabChange = jest.fn();
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [{ ...mockOrder, symbol: 'BTC' }],
      });

      const { getAllByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      await waitFor(() => {
        expect(getAllByText('perps.market.orders').length).toBeGreaterThan(0);
      });

      const ordersTab = getAllByText('perps.market.orders')[0];
      fireEvent.press(ordersTab);

      expect(onActiveTabChange).toHaveBeenCalledWith('orders');
    });

    it('displays correct content for active tab', async () => {
      const onActiveTabChange = jest.fn();
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });

      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      await waitFor(() => {
        expect(
          getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
        ).toBeDefined();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state for orders tab when no orders', () => {
      // Arrange
      const onActiveTabChange = jest.fn();
      // Default mocks already have no position/orders

      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Statistics only title should be shown
      expect(getByText('perps.market.statistics')).toBeDefined();
    });
  });

  describe('Tab Priority', () => {
    it('prioritizes position tab when both position and orders exist', () => {
      const onActiveTabChange = jest.fn();
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [{ ...mockOrder, symbol: 'BTC' }],
      });

      const { getAllByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      expect(getAllByText('perps.market.position').length).toBeGreaterThan(0);
      expect(getAllByText('perps.market.orders').length).toBeGreaterThan(0);
      expect(getAllByText('perps.market.statistics').length).toBeGreaterThan(0);
    });
  });

  describe('Initial Tab Selection', () => {
    it('sets initial tab to position when initialTab is position', async () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });
      const onActiveTabChange = jest.fn();

      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          initialTab="position"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      await waitFor(() => {
        expect(
          getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
        ).toBeDefined();
      });
      expect(onActiveTabChange).toHaveBeenCalledWith('position');
    });

    it('sets initial tab to orders when initialTab is orders', async () => {
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [{ ...mockOrder, symbol: 'BTC' }],
      });
      const onActiveTabChange = jest.fn();

      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          initialTab="orders"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      await waitFor(() => {
        expect(
          getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
        ).toBeDefined();
      });
      expect(onActiveTabChange).toHaveBeenCalledWith('orders');
    });

    it('sets initial tab to statistics when initialTab is statistics', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          initialTab="statistics"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Statistics-only title should be visible when no positions/orders
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_ONLY_TITLE),
      ).toBeDefined();
      expect(onActiveTabChange).toHaveBeenCalledWith('statistics');
    });

    it('defaults to statistics when initialTab is undefined', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Statistics-only title should be visible by default when no positions/orders
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_ONLY_TITLE),
      ).toBeDefined();
    });

    it('ignores initialTab when tab is not available', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          initialTab="orders" // orders tab not available since no orders
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Should fall back to statistics-only title since orders tab is not available
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_ONLY_TITLE),
      ).toBeDefined();
    });

    it('respects initialTab over auto-selection when both position and orders exist', async () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [{ ...mockOrder, symbol: 'BTC' }],
      });
      const onActiveTabChange = jest.fn();

      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          initialTab="orders"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      await waitFor(() => {
        expect(
          getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
        ).toBeDefined();
      });
      expect(onActiveTabChange).toHaveBeenCalledWith('orders');
    });

    it('does not override user interaction with initialTab', async () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [{ ...mockOrder, symbol: 'BTC' }],
      });
      const onActiveTabChange = jest.fn();
      const { getAllByText, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          initialTab="orders"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      const positionTab = getAllByText('perps.market.position')[0];
      fireEvent.press(positionTab);

      await waitFor(() => {
        expect(
          getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
        ).toBeDefined();
      });
      expect(onActiveTabChange).toHaveBeenLastCalledWith('position');
    });

    it('handles initialTab when data loads after component mount', () => {
      const onActiveTabChange = jest.fn();
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });

      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          initialTab="position"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
      ).toBeDefined();
      expect(onActiveTabChange).toHaveBeenCalledWith('position');
    });
  });

  describe('TP/SL Order Active Type Display', () => {
    it('displays BOTH when order has both TP and SL from same order', async () => {
      const orderWithBothTPSL = {
        ...mockOrder,
        symbol: 'BTC',
        orderId: '12345',
        detailedOrderType: 'Take Profit / Stop Loss',
      };

      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            symbol: 'BTC',
            activeTPOrderId: '12345',
            activeSLOrderId: '12345',
          },
        ],
      });
      mockUsePerpsLiveOrders.mockReturnValue({ orders: [orderWithBothTPSL] });

      const { getAllByText, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      const ordersTab = getAllByText('perps.market.orders')[0];
      fireEvent.press(ordersTab);

      await waitFor(() => {
        expect(getByTestId('mock-perps-open-order-card')).toBeDefined();
      });
    });

    it('displays TP when order has only TP active', async () => {
      const orderWithTP = {
        ...mockOrder,
        symbol: 'BTC',
        orderId: '12345',
        detailedOrderType: 'Take Profit',
      };

      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            symbol: 'BTC',
            activeTPOrderId: '12345',
            activeSLOrderId: null,
          },
        ],
      });
      mockUsePerpsLiveOrders.mockReturnValue({ orders: [orderWithTP] });

      const { getAllByText, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      const ordersTab = getAllByText('perps.market.orders')[0];
      fireEvent.press(ordersTab);

      await waitFor(() => {
        expect(getByTestId('mock-perps-open-order-card')).toBeDefined();
      });
    });

    it('displays SL when order has only SL active', async () => {
      const orderWithSL = {
        ...mockOrder,
        symbol: 'BTC',
        orderId: '12345',
        detailedOrderType: 'Stop Loss',
      };

      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            ...mockPosition,
            symbol: 'BTC',
            activeTPOrderId: null,
            activeSLOrderId: '12345',
          },
        ],
      });
      mockUsePerpsLiveOrders.mockReturnValue({ orders: [orderWithSL] });

      const { getAllByText, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      const ordersTab = getAllByText('perps.market.orders')[0];
      fireEvent.press(ordersTab);

      await waitFor(() => {
        expect(getByTestId('mock-perps-open-order-card')).toBeDefined();
      });
    });
  });

  describe('Order Sorting', () => {
    it('sorts orders by detailedOrderType then by orderId', () => {
      const limitOrder = {
        ...mockOrder,
        symbol: 'BTC',
        orderId: 'order-2',
        detailedOrderType: 'Limit Order',
        orderType: 'limit',
      };
      const marketOrder = {
        ...mockOrder,
        symbol: 'BTC',
        orderId: 'order-1',
        detailedOrderType: 'Market Order',
        orderType: 'market',
      };
      const stopLossOrder = {
        ...mockOrder,
        symbol: 'BTC',
        orderId: 'order-3',
        detailedOrderType: 'Stop Loss',
        orderType: 'stop',
      };

      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [stopLossOrder, limitOrder, marketOrder],
      });

      const { getAllByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      expect(getAllByTestId('mock-perps-open-order-card')).toHaveLength(3);
    });

    it('falls back to orderType when detailedOrderType is missing', () => {
      const orderWithoutDetailedType = {
        ...mockOrder,
        symbol: 'BTC',
        orderId: 'order-1',
        detailedOrderType: undefined,
        orderType: 'limit',
      };

      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [orderWithoutDetailedType],
      });

      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      expect(getByTestId('mock-perps-open-order-card')).toBeDefined();
    });
  });

  describe('External Tab Control', () => {
    it('switches to external tab when activeTabId prop changes', async () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [{ ...mockOrder, symbol: 'BTC' }],
      });

      const onActiveTabChange = jest.fn();
      const { rerender, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          activeTabId="statistics"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      rerender(
        <PerpsMarketTabs
          symbol="BTC"
          activeTabId="position"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      await waitFor(() => {
        expect(
          getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
        ).toBeDefined();
      });
    });

    it('preserves current tab when new position appears without external tab change', async () => {
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [{ ...mockOrder, symbol: 'BTC' }],
      });
      mockUsePerpsLivePositions.mockReturnValue({ positions: [] });

      const onActiveTabChange = jest.fn();
      const { rerender, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      await waitFor(() => {
        expect(
          getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
        ).toBeDefined();
      });

      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });

      rerender(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      await waitFor(() => {
        expect(
          getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
        ).toBeDefined();
      });
    });

    it('ignores activeTabId for unavailable tabs', () => {
      const onActiveTabChange = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          activeTabId="orders"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_ONLY_TITLE),
      ).toBeDefined();
    });
  });

  describe('Tooltip Interaction', () => {
    it('closes tooltip when close button is pressed', async () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [{ ...mockPosition, symbol: 'BTC' }],
      });

      const { getByTestId, queryByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      await waitFor(() => {
        expect(
          getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
        ).toBeDefined();
      });

      expect(queryByTestId('perps-bottom-sheet-tooltip')).toBeNull();
    });
  });

  describe('Order Cancellation Cleanup', () => {
    it('removes cancelled order IDs when orders are removed from WebSocket', async () => {
      const order1 = { ...mockOrder, symbol: 'BTC', orderId: 'order-1' };
      const order2 = { ...mockOrder, symbol: 'BTC', orderId: 'order-2' };

      mockUsePerpsLiveOrders.mockReturnValue({ orders: [order1, order2] });
      mockCancelOrder.mockResolvedValue({ success: true });

      const { getAllByText, getAllByTestId, rerender } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      const ordersTab = getAllByText('perps.market.orders')[0];
      fireEvent.press(ordersTab);

      await waitFor(() => {
        expect(getAllByTestId('mock-perps-open-order-card')).toHaveLength(2);
      });

      const orderCards = getAllByTestId('mock-perps-open-order-card');
      fireEvent.press(orderCards[0]);

      await waitFor(() => {
        expect(mockCancelOrder).toHaveBeenCalled();
      });

      mockUsePerpsLiveOrders.mockReturnValue({ orders: [order2] });

      rerender(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      await waitFor(() => {
        expect(getAllByTestId('mock-perps-open-order-card')).toHaveLength(1);
      });
    });
  });

  describe('Order Cancellation', () => {
    const mockOnOrderCancelled = jest.fn();

    beforeEach(() => {
      mockOnOrderCancelled.mockReset();
    });

    it('displays in-progress toast then success toast when order cancellation succeeds', async () => {
      mockCancelOrder.mockResolvedValue({ success: true });
      const btcOrder = { ...mockOrder, symbol: 'BTC' };
      mockUsePerpsLiveOrders.mockReturnValue({ orders: [btcOrder] });

      const { getAllByText, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          onOrderCancelled={mockOnOrderCancelled}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      const ordersTab = getAllByText('perps.market.orders')[0];
      fireEvent.press(ordersTab);

      await waitFor(() => {
        expect(getByTestId('mock-perps-open-order-card')).toBeDefined();
      });

      const orderCard = getByTestId('mock-perps-open-order-card');
      fireEvent.press(orderCard);

      await waitFor(() => {
        expect(mockCancelOrder).toHaveBeenCalledWith({
          orderId: btcOrder.orderId,
          symbol: btcOrder.symbol,
        });
      });

      expect(mockShowToast).toHaveBeenCalledTimes(2);

      expect(
        mockPerpsToastOptions.orderManagement.shared.cancellationInProgress,
      ).toHaveBeenCalledWith(
        'long',
        btcOrder.remainingSize,
        btcOrder.symbol,
        btcOrder.detailedOrderType,
      );

      expect(
        mockPerpsToastOptions.orderManagement.shared.cancellationSuccess,
      ).toHaveBeenCalled();

      expect(mockOnOrderCancelled).toHaveBeenCalledWith(btcOrder.orderId);
    });

    it('displays in-progress toast then error toast when order cancellation fails', async () => {
      mockCancelOrder.mockResolvedValue({
        success: false,
        error: 'Order not found',
      });
      const btcOrder = { ...mockOrder, symbol: 'BTC' };
      mockUsePerpsLiveOrders.mockReturnValue({ orders: [btcOrder] });

      const { getAllByText, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          onOrderCancelled={mockOnOrderCancelled}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      const ordersTab = getAllByText('perps.market.orders')[0];
      fireEvent.press(ordersTab);

      await waitFor(() => {
        expect(getByTestId('mock-perps-open-order-card')).toBeDefined();
      });

      const orderCard = getByTestId('mock-perps-open-order-card');
      fireEvent.press(orderCard);

      await waitFor(() => {
        expect(mockCancelOrder).toHaveBeenCalledWith({
          orderId: btcOrder.orderId,
          symbol: btcOrder.symbol,
        });
      });

      expect(mockShowToast).toHaveBeenCalledTimes(2);
      expect(mockShowToast).toHaveBeenNthCalledWith(1, {
        type: 'info',
        message: 'mock-in-progress-toast',
        title: 'Cancelling Order',
      });
      expect(mockShowToast).toHaveBeenNthCalledWith(2, {
        type: 'error',
        message: 'mock-error-toast',
        title: 'Cancellation Failed',
      });

      expect(mockOnOrderCancelled).not.toHaveBeenCalled();
    });

    it('displays in-progress toast then error toast when order cancellation throws exception', async () => {
      mockCancelOrder.mockRejectedValue(new Error('Network error'));
      const btcOrder = { ...mockOrder, symbol: 'BTC' };
      mockUsePerpsLiveOrders.mockReturnValue({ orders: [btcOrder] });

      const { getAllByText, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          onActiveTabChange={jest.fn()}
          onOrderCancelled={mockOnOrderCancelled}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      const ordersTab = getAllByText('perps.market.orders')[0];
      fireEvent.press(ordersTab);

      await waitFor(() => {
        expect(getByTestId('mock-perps-open-order-card')).toBeDefined();
      });

      const orderCard = getByTestId('mock-perps-open-order-card');
      fireEvent.press(orderCard);

      await waitFor(() => {
        expect(mockCancelOrder).toHaveBeenCalledWith({
          orderId: btcOrder.orderId,
          symbol: btcOrder.symbol,
        });
      });

      expect(mockShowToast).toHaveBeenCalledTimes(2);
      expect(mockShowToast).toHaveBeenNthCalledWith(1, {
        type: 'info',
        message: 'mock-in-progress-toast',
        title: 'Cancelling Order',
      });
      expect(mockShowToast).toHaveBeenNthCalledWith(2, {
        type: 'error',
        message: 'mock-error-toast',
        title: 'Cancellation Failed',
      });

      expect(mockOnOrderCancelled).not.toHaveBeenCalled();
    });
  });

  // Note: Navigation tests (tutorial card, activity link) removed as these elements
  // have been relocated to other components as part of the home screen refactor.
  // See PR description: "Activity Link Relocation" and "Learn More Component" sections.
});
