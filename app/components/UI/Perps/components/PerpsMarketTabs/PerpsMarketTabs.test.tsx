import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsMarketTabs from './PerpsMarketTabs';
import { PerpsMarketTabsSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
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

// Mock dependencies
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
  });

  describe('Rendering', () => {
    it('renders statistics tab by default', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert
      expect(getByText('perps.market.statistics')).toBeDefined();
    });

    it('shows loading skeleton when position is loading', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition
          unfilledOrders={[]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Skeleton component should be rendered
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.SKELETON_TAB_BAR),
      ).toBeDefined();
    });

    it('displays position tab when position exists', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert
      expect(getByText('perps.market.position')).toBeDefined();
    });

    it('displays orders tab when unfilled orders exist', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert
      expect(getByText('perps.market.orders')).toBeDefined();
    });
  });

  describe('Tab Switching', () => {
    it('switches tabs when clicked', () => {
      // Arrange
      const onActiveTabChange = jest.fn();
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Act - Click on position tab
      const positionTab = getByText('perps.market.position');
      fireEvent.press(positionTab);

      // Assert
      expect(onActiveTabChange).toHaveBeenCalledWith('position');
    });

    it('displays correct content for active tab', () => {
      // Arrange
      const onActiveTabChange = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Should show position content when position tab is active
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
      ).toBeDefined();
    });
  });

  describe('Empty States', () => {
    it('shows empty state for orders tab when no orders', () => {
      // Arrange
      const onActiveTabChange = jest.fn();
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[]}
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
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - All tabs should be available
      expect(getByText('perps.market.position')).toBeDefined();
      expect(getByText('perps.market.orders')).toBeDefined();
      expect(getByText('perps.market.statistics')).toBeDefined();
    });
  });

  describe('Initial Tab Selection', () => {
    it('sets initial tab to position when initialTab is position', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[]}
          initialTab="position"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Position content should be visible
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
      ).toBeDefined();
      expect(onActiveTabChange).toHaveBeenCalledWith('position');
    });

    it('sets initial tab to orders when initialTab is orders', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          initialTab="orders"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Orders content should be visible
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
      ).toBeDefined();
      expect(onActiveTabChange).toHaveBeenCalledWith('orders');
    });

    it('sets initial tab to statistics when initialTab is statistics', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[]}
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
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[]}
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
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[]}
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

    it('respects initialTab over auto-selection when both position and orders exist', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          initialTab="orders" // Should override position priority
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Orders content should be visible despite position existing
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
      ).toBeDefined();
      expect(onActiveTabChange).toHaveBeenCalledWith('orders');
    });

    it('does not override user interaction with initialTab', () => {
      // Arrange
      const onActiveTabChange = jest.fn();
      const { getByText, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          initialTab="orders"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Act - User clicks on position tab
      const positionTab = getByText('perps.market.position');
      fireEvent.press(positionTab);

      // Assert - Should show position content, not orders
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
      ).toBeDefined();
      expect(onActiveTabChange).toHaveBeenLastCalledWith('position');
    });

    it('handles initialTab when data loads after component mount', async () => {
      // Arrange
      const onActiveTabChange = jest.fn();
      const { rerender, getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition // Initially loading
          unfilledOrders={[]}
          initialTab="position"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Act - Simulate data loading completion
      rerender(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition} // Now position data is available
          isLoadingPosition={false}
          unfilledOrders={[]}
          initialTab="position"
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Should now show position content
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
      ).toBeDefined();
      expect(onActiveTabChange).toHaveBeenCalledWith('position');
    });
  });

  describe('Order Cancellation', () => {
    const mockOnOrderCancelled = jest.fn();

    beforeEach(() => {
      mockOnOrderCancelled.mockReset();
    });

    it('displays in-progress toast then success toast when order cancellation succeeds', async () => {
      // Arrange
      mockCancelOrder.mockResolvedValue({ success: true });

      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          onActiveTabChange={jest.fn()}
          onOrderCancelled={mockOnOrderCancelled}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Act - Click the cancel button on the mocked PerpsOpenOrderCard
      const orderCard = getByTestId('mock-perps-open-order-card');
      fireEvent.press(orderCard);

      // Assert - Wait for async operations to complete
      await waitFor(() => {
        expect(mockCancelOrder).toHaveBeenCalledWith({
          orderId: mockOrder.orderId,
          coin: mockOrder.symbol,
        });
      });

      // Verify toast sequence
      expect(mockShowToast).toHaveBeenCalledTimes(2);

      // Verify in-progress toast was called first
      expect(
        mockPerpsToastOptions.orderManagement.shared.cancellationInProgress,
      ).toHaveBeenCalledWith(
        'long',
        mockOrder.remainingSize,
        mockOrder.symbol,
        mockOrder.detailedOrderType,
      );

      // Verify success toast was called second
      expect(
        mockPerpsToastOptions.orderManagement.shared.cancellationSuccess,
      ).toHaveBeenCalled();

      // Verify onOrderCancelled callback was called
      expect(mockOnOrderCancelled).toHaveBeenCalledWith(mockOrder.orderId);
    });

    it('displays in-progress toast then error toast when order cancellation fails', async () => {
      // Arrange
      mockCancelOrder.mockResolvedValue({
        success: false,
        error: 'Order not found',
      });

      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          onActiveTabChange={jest.fn()}
          onOrderCancelled={mockOnOrderCancelled}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Act - Click the cancel button on the mocked PerpsOpenOrderCard
      const orderCard = getByTestId('mock-perps-open-order-card');
      fireEvent.press(orderCard);

      // Assert - Wait for async operations to complete
      await waitFor(() => {
        expect(mockCancelOrder).toHaveBeenCalledWith({
          orderId: mockOrder.orderId,
          coin: mockOrder.symbol,
        });
      });

      // Verify toast sequence: in-progress toast then error toast
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

      // In a failure case, onOrderCancelled should not be called
      expect(mockOnOrderCancelled).not.toHaveBeenCalled();
    });

    it('displays in-progress toast then error toast when order cancellation throws exception', async () => {
      // Arrange
      mockCancelOrder.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          onActiveTabChange={jest.fn()}
          onOrderCancelled={mockOnOrderCancelled}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Act - Click the cancel button on the mocked PerpsOpenOrderCard
      const orderCard = getByTestId('mock-perps-open-order-card');
      fireEvent.press(orderCard);

      // Assert - Wait for async operations to complete
      await waitFor(() => {
        expect(mockCancelOrder).toHaveBeenCalledWith({
          orderId: mockOrder.orderId,
          coin: mockOrder.symbol,
        });
      });

      // Verify toast sequence: in-progress toast then error toast
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

      // In an exception case, onOrderCancelled should not be called
      expect(mockOnOrderCancelled).not.toHaveBeenCalled();
    });
  });
});
