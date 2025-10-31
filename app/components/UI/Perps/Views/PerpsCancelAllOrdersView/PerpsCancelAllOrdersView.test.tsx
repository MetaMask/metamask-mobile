import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsCancelAllOrdersView from './PerpsCancelAllOrdersView';
import { usePerpsCancelAllOrders, usePerpsLiveOrders } from '../../hooks';

// Mock all dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn(), goBack: jest.fn() })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../hooks', () => ({
  usePerpsLiveOrders: jest.fn(),
  usePerpsCancelAllOrders: jest.fn(),
}));

jest.mock('../../hooks/usePerpsToasts', () => ({
  __esModule: true,
  default: jest.fn(() => ({ showToast: jest.fn() })),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      accent03: { normal: '#00ff00', dark: '#008800' },
      accent01: { light: '#ffcccc', dark: '#cc0000' },
      primary: { default: '#0000ff' },
      background: { default: '#ffffff' },
    },
  })),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const mockReact = jest.requireActual<typeof React>('react');
    return mockReact.forwardRef(
      (props: { children: React.ReactNode }, _ref) => <>{props.children}</>,
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => 'BottomSheetHeader',
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray?: {
          label: string;
          onPress: () => void;
          disabled?: boolean;
        }[];
      }) => (
        <View>
          {buttonPropsArray?.map((buttonProps, index) => (
            <TouchableOpacity
              key={index}
              onPress={buttonProps.onPress}
              disabled={buttonProps.disabled}
            >
              <Text>{buttonProps.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
      ButtonsAlignment: {
        Horizontal: 'Horizontal',
        Vertical: 'Vertical',
      },
    };
  },
);

const mockUsePerpsLiveOrders = usePerpsLiveOrders as jest.MockedFunction<
  typeof usePerpsLiveOrders
>;
const mockUsePerpsCancelAllOrders =
  usePerpsCancelAllOrders as jest.MockedFunction<
    typeof usePerpsCancelAllOrders
  >;

describe('PerpsCancelAllOrdersView', () => {
  const mockOrders = [
    {
      orderId: 'order-1',
      symbol: 'BTC',
      side: 'buy' as const,
      orderType: 'limit' as const,
      size: '0.1',
      originalSize: '0.1',
      price: '50000',
      filledSize: '0',
      remainingSize: '0.1',
      status: 'open' as const,
      timestamp: Date.now(),
    },
    {
      orderId: 'order-2',
      symbol: 'ETH',
      side: 'sell' as const,
      orderType: 'limit' as const,
      size: '1.0',
      originalSize: '1.0',
      price: '3000',
      filledSize: '0',
      remainingSize: '1.0',
      status: 'open' as const,
      timestamp: Date.now(),
    },
  ];

  const mockCancelAllHook = {
    isCanceling: false,
    orderCount: 2,
    handleCancelAll: jest.fn(),
    handleKeepOrders: jest.fn(),
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: mockOrders,
      isInitialLoading: false,
    });
    mockUsePerpsCancelAllOrders.mockReturnValue(mockCancelAllHook);
  });

  it('renders cancel all orders view with orders', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsCancelAllOrdersView />);

    // Assert
    expect(getByText('perps.cancel_all_modal.title')).toBeTruthy();
    expect(getByText('perps.cancel_all_modal.description')).toBeTruthy();
  });

  it('renders empty state when no orders', () => {
    // Arrange
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    });
    mockUsePerpsCancelAllOrders.mockReturnValue({
      ...mockCancelAllHook,
      orderCount: 0,
    });

    // Act
    const { getByText } = render(<PerpsCancelAllOrdersView />);

    // Assert
    expect(getByText('perps.order.no_orders')).toBeTruthy();
  });

  it('renders loading state when canceling', () => {
    // Arrange
    mockUsePerpsCancelAllOrders.mockReturnValue({
      ...mockCancelAllHook,
      isCanceling: true,
    });

    // Act
    const { getAllByText } = render(<PerpsCancelAllOrdersView />);

    // Assert
    const cancelingElements = getAllByText('perps.cancel_all_modal.canceling');
    expect(cancelingElements.length).toBeGreaterThan(0);
  });

  it('displays footer buttons with correct labels', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsCancelAllOrdersView />);

    // Assert
    expect(getByText('perps.cancel_all_modal.keep_orders')).toBeTruthy();
    expect(getByText('perps.cancel_all_modal.confirm')).toBeTruthy();
  });

  it('shows canceling label on confirm button when in progress', () => {
    // Arrange
    mockUsePerpsCancelAllOrders.mockReturnValue({
      ...mockCancelAllHook,
      isCanceling: true,
    });

    // Act
    const { getAllByText } = render(<PerpsCancelAllOrdersView />);

    // Assert
    const cancelingElements = getAllByText('perps.cancel_all_modal.canceling');
    expect(cancelingElements.length).toBeGreaterThan(0);
  });

  it('renders with empty orders gracefully', () => {
    // Arrange
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    });
    mockUsePerpsCancelAllOrders.mockReturnValue({
      ...mockCancelAllHook,
      orderCount: 0,
    });

    // Act
    const { getByText } = render(<PerpsCancelAllOrdersView />);

    // Assert
    expect(getByText('perps.order.no_orders')).toBeTruthy();
  });
});
