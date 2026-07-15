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
  const MockReact = jest.requireActual<typeof React>('react');
  const { View, Pressable, Text: RNText } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  const BottomSheet = MockReact.forwardRef(
    (
      {
        children,
      }: {
        children: React.ReactNode;
      },
      _ref: React.Ref<{
        onOpenBottomSheet: () => void;
        onCloseBottomSheet: (callback?: () => void) => void;
      }>,
    ) => <View>{children}</View>,
  );
  BottomSheet.displayName = 'BottomSheet';

  const BottomSheetHeader = ({
    children,
    onClose,
  }: {
    children: React.ReactNode;
    onClose?: () => void;
  }) => (
    <View>
      {typeof children === 'string' ? <RNText>{children}</RNText> : children}
      <Pressable onPress={onClose} />
    </View>
  );

  const BottomSheetFooter = ({
    primaryButtonProps,
    secondaryButtonProps,
  }: {
    primaryButtonProps?: {
      children: React.ReactNode;
      onPress: () => void;
      isDisabled?: boolean;
      isLoading?: boolean;
      isDanger?: boolean;
    };
    secondaryButtonProps?: {
      children: React.ReactNode;
      onPress: () => void;
      isDisabled?: boolean;
    };
  }) => (
    <View>
      {secondaryButtonProps ? (
        <Pressable
          onPress={secondaryButtonProps.onPress}
          disabled={secondaryButtonProps.isDisabled}
        >
          <RNText>{secondaryButtonProps.children}</RNText>
        </Pressable>
      ) : null}
      {primaryButtonProps ? (
        <Pressable
          onPress={primaryButtonProps.onPress}
          disabled={
            primaryButtonProps.isDisabled || primaryButtonProps.isLoading
          }
          accessibilityState={{
            disabled:
              primaryButtonProps.isDisabled || primaryButtonProps.isLoading,
            busy: primaryButtonProps.isLoading,
          }}
        >
          <RNText>{primaryButtonProps.children}</RNText>
        </Pressable>
      ) : null}
    </View>
  );

  return {
    ...actual,
    BottomSheet,
    BottomSheetHeader,
    BottomSheetFooter,
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

  it('keeps description and confirm label visible while canceling', () => {
    // Arrange
    mockUsePerpsCancelAllOrders.mockReturnValue({
      ...mockCancelAllHook,
      isCanceling: true,
    });

    // Act
    const { getByText, queryByText } = render(<PerpsCancelAllOrdersView />);

    // Assert
    expect(getByText('perps.cancel_all_modal.description')).toBeTruthy();
    expect(getByText('perps.cancel_all_modal.confirm')).toBeTruthy();
    expect(queryByText('perps.cancel_all_modal.canceling')).toBeNull();
  });

  it('displays footer buttons with correct labels', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsCancelAllOrdersView />);

    // Assert
    expect(getByText('perps.cancel_all_modal.keep_orders')).toBeTruthy();
    expect(getByText('perps.cancel_all_modal.confirm')).toBeTruthy();
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
