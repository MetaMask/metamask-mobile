import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PerpsCancelAllOrdersView from './PerpsCancelAllOrdersView';
import { usePerpsCancelAllOrders, usePerpsLiveOrders } from '../../hooks';

const mockGoBack = jest.fn();

// Mock all dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn(), goBack: mockGoBack })),
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

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

// BottomSheet overwrites refs via useImperativeHandle; stub keeps external sheetRef usable.
jest.mock('@metamask/design-system-react-native', () => {
  const MockReact = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  const BottomSheet = MockReact.forwardRef(
    ({ children }: { children: React.ReactNode }, _ref: React.Ref<unknown>) => (
      <View>{children}</View>
    ),
  );
  BottomSheet.displayName = 'BottomSheet';

  return {
    ...actual,
    BottomSheet,
  };
});

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
      timestamp: 1722470400000,
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
      timestamp: 1722470400000,
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
    expect(getByText('perps.cancel_all_modal.title')).toBeOnTheScreen();
    expect(getByText('perps.cancel_all_modal.description')).toBeOnTheScreen();
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
    expect(getByText('perps.order.no_orders')).toBeOnTheScreen();
  });

  it('keeps description and confirm label visible while canceling', () => {
    // Arrange
    mockUsePerpsCancelAllOrders.mockReturnValue({
      ...mockCancelAllHook,
      isCanceling: true,
    });

    // Act
    const { getByText, queryByText } = render(<PerpsCancelAllOrdersView />);

    // Assert
    expect(getByText('perps.cancel_all_modal.description')).toBeOnTheScreen();
    expect(getByText('perps.cancel_all_modal.confirm')).toBeOnTheScreen();
    expect(queryByText('perps.cancel_all_modal.canceling')).toBeNull();
  });

  it('displays footer buttons with correct labels', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsCancelAllOrdersView />);

    // Assert
    expect(getByText('perps.cancel_all_modal.keep_orders')).toBeOnTheScreen();
    expect(getByText('perps.cancel_all_modal.confirm')).toBeOnTheScreen();
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
    expect(getByText('perps.order.no_orders')).toBeOnTheScreen();
  });

  it('navigates back when header close is pressed', () => {
    // Arrange & Act — with orders
    const { getByTestId, unmount } = render(<PerpsCancelAllOrdersView />);

    // Assert
    fireEvent.press(getByTestId('header-close'));
    expect(mockGoBack).toHaveBeenCalled();

    // Arrange & Act — empty state uses the same close wiring
    unmount();
    mockGoBack.mockClear();
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    });
    mockUsePerpsCancelAllOrders.mockReturnValue({
      ...mockCancelAllHook,
      orderCount: 0,
    });
    const { getByTestId: getEmptyTestId } = render(
      <PerpsCancelAllOrdersView />,
    );

    fireEvent.press(getEmptyTestId('header-close'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('closes via sheetRef when used with an external sheetRef', () => {
    // Arrange
    const mockOnClose = jest.fn();
    const mockOnCloseBottomSheet = jest.fn((callback?: () => void) =>
      callback?.(),
    );
    const mockSheetRef = {
      current: {
        onOpenBottomSheet: jest.fn(),
        onCloseBottomSheet: mockOnCloseBottomSheet,
      },
    };

    // Act — with orders
    const { getByTestId, unmount } = render(
      <PerpsCancelAllOrdersView
        sheetRef={mockSheetRef}
        onClose={mockOnClose}
      />,
    );

    // Assert — overlay mode closes via sheetRef instead of navigation goBack
    fireEvent.press(getByTestId('header-close'));
    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();

    // Act — empty state overlay path
    unmount();
    mockOnClose.mockClear();
    mockOnCloseBottomSheet.mockClear();
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    });
    mockUsePerpsCancelAllOrders.mockReturnValue({
      ...mockCancelAllHook,
      orderCount: 0,
    });
    const { getByTestId: getEmptyTestId } = render(
      <PerpsCancelAllOrdersView
        sheetRef={mockSheetRef}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(getEmptyTestId('header-close'));
    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
