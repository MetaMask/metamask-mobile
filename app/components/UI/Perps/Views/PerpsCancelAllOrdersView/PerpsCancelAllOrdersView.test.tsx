import React, { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import type { CancelOrdersResult } from '@metamask/perps-controller';
import PerpsCancelAllOrdersView from './PerpsCancelAllOrdersView';
import { usePerpsCancelAllOrders, usePerpsLiveOrders } from '../../hooks';

const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockCancelAllSuccess = jest.fn((count: number) => ({
  type: 'cancelAllSuccess',
  count,
}));
const mockCancelAllPartialSuccess = jest.fn(
  (successCount: number, totalCount: number) => ({
    type: 'cancelAllPartialSuccess',
    successCount,
    totalCount,
  }),
);
const mockCancelAllFailed = jest.fn((error?: string) => ({
  type: 'cancelAllFailed',
  error,
}));

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
  default: jest.fn(() => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      orderManagement: {
        shared: {
          cancelAllSuccess: mockCancelAllSuccess,
          cancelAllPartialSuccess: mockCancelAllPartialSuccess,
          cancelAllFailed: mockCancelAllFailed,
        },
      },
    },
  })),
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

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual<typeof React>('react');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  const BottomSheet = ReactActual.forwardRef(
    (
      {
        children,
      }: {
        children?: React.ReactNode;
      },
      ref: React.Ref<{
        onOpenBottomSheet: () => void;
        onCloseBottomSheet: (callback?: () => void) => void;
      }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: jest.fn(),
        onCloseBottomSheet: (callback?: () => void) => {
          callback?.();
        },
      }));

      return <View testID="bottom-sheet">{children}</View>;
    },
  );
  BottomSheet.displayName = 'BottomSheet';

  return {
    ...actual,
    BottomSheet,
    BottomSheetHeader: ({
      children,
      onClose,
      closeButtonProps,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
      closeButtonProps?: { testID?: string };
    }) => (
      <View>
        <Text>{children}</Text>
        <TouchableOpacity
          testID={closeButtonProps?.testID ?? 'header-close'}
          onPress={onClose}
        />
      </View>
    ),
    BottomSheetFooter: ({
      secondaryButtonProps,
      primaryButtonProps,
    }: {
      secondaryButtonProps?: {
        children?: React.ReactNode;
        onPress?: () => void;
      };
      primaryButtonProps?: {
        children?: React.ReactNode;
        onPress?: () => void;
      };
    }) => (
      <View>
        <TouchableOpacity
          testID="keep-orders-button"
          onPress={secondaryButtonProps?.onPress}
        >
          <Text>{secondaryButtonProps?.children}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="confirm-cancel-button"
          onPress={primaryButtonProps?.onPress}
        >
          <Text>{primaryButtonProps?.children}</Text>
        </TouchableOpacity>
      </View>
    ),
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

  let capturedCancelOptions: {
    onSuccess?: (result: CancelOrdersResult) => void;
    onError?: (error: Error) => void;
    navigateBackOnSuccess?: boolean;
  } = {};

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCancelOptions = {};
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: mockOrders,
      isInitialLoading: false,
    });
    mockUsePerpsCancelAllOrders.mockImplementation((_orders, options) => {
      capturedCancelOptions = options ?? {};
      return mockCancelAllHook;
    });
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

  it('does not navigate back when closing with an external sheetRef', () => {
    // Arrange
    const mockOnClose = jest.fn();
    const sheetRef = createRef<BottomSheetRef | null>();

    // Act — with orders
    const { getByTestId, unmount } = render(
      <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={mockOnClose} />,
    );

    // Assert — overlay mode closes via sheetRef, not navigation.goBack
    fireEvent.press(getByTestId('header-close'));
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();

    // Act — empty state overlay path
    unmount();
    mockGoBack.mockClear();
    mockOnClose.mockClear();
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    });
    mockUsePerpsCancelAllOrders.mockImplementation((_orders, options) => {
      capturedCancelOptions = options ?? {};
      return {
        ...mockCancelAllHook,
        orderCount: 0,
      };
    });
    const { getByTestId: getEmptyTestId } = render(
      <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={mockOnClose} />,
    );

    fireEvent.press(getEmptyTestId('header-close'));
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls handleKeepOrders when keep orders is pressed in standalone mode', () => {
    const { getByTestId } = render(<PerpsCancelAllOrdersView />);

    fireEvent.press(getByTestId('keep-orders-button'));

    expect(mockCancelAllHook.handleKeepOrders).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('closes overlay when keep orders is pressed with an external sheetRef', () => {
    const mockOnClose = jest.fn();
    const sheetRef = createRef<BottomSheetRef | null>();
    const { getByTestId } = render(
      <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={mockOnClose} />,
    );

    fireEvent.press(getByTestId('keep-orders-button'));

    expect(mockCancelAllHook.handleKeepOrders).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('passes navigateBackOnSuccess false when using an external sheetRef', () => {
    const sheetRef = createRef<BottomSheetRef | null>();

    render(<PerpsCancelAllOrdersView sheetRef={sheetRef} />);

    expect(capturedCancelOptions.navigateBackOnSuccess).toBe(false);
  });

  it('shows success toast and closes overlay when cancel all succeeds', () => {
    const mockOnClose = jest.fn();
    const sheetRef = createRef<BottomSheetRef | null>();
    render(
      <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={mockOnClose} />,
    );

    capturedCancelOptions.onSuccess?.({
      success: true,
      successCount: 2,
      failureCount: 0,
    } as CancelOrdersResult);

    expect(mockCancelAllSuccess).toHaveBeenCalledWith(2);
    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'cancelAllSuccess',
      count: 2,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows partial success toast when some orders fail to cancel', () => {
    const mockOnClose = jest.fn();
    const sheetRef = createRef<BottomSheetRef | null>();
    render(
      <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={mockOnClose} />,
    );

    capturedCancelOptions.onSuccess?.({
      success: false,
      successCount: 1,
      failureCount: 1,
    } as CancelOrdersResult);

    expect(mockCancelAllPartialSuccess).toHaveBeenCalledWith(1, 2);
    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'cancelAllPartialSuccess',
      successCount: 1,
      totalCount: 2,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not show toast when cancel all reports zero successes', () => {
    render(<PerpsCancelAllOrdersView />);

    capturedCancelOptions.onSuccess?.({
      success: false,
      successCount: 0,
      failureCount: 2,
    } as CancelOrdersResult);

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows failed toast when cancel all errors', () => {
    render(<PerpsCancelAllOrdersView />);

    capturedCancelOptions.onError?.(new Error('Network timeout'));

    expect(mockCancelAllFailed).toHaveBeenCalledWith('Network timeout');
    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'cancelAllFailed',
      error: 'Network timeout',
    });
  });

  it('shows failed toast with default message when error has empty message', () => {
    render(<PerpsCancelAllOrdersView />);

    capturedCancelOptions.onError?.(new Error(''));

    expect(mockCancelAllFailed).toHaveBeenCalledWith('Unknown error');
    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'cancelAllFailed',
      error: 'Unknown error',
    });
  });

  it('does not close overlay when cancel succeeds without external sheetRef', () => {
    render(<PerpsCancelAllOrdersView />);

    capturedCancelOptions.onSuccess?.({
      success: true,
      successCount: 2,
      failureCount: 0,
    } as CancelOrdersResult);

    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'cancelAllSuccess',
      count: 2,
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
