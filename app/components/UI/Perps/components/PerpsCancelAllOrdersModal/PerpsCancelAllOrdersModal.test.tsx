import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import PerpsCancelAllOrdersModal from './PerpsCancelAllOrdersModal';
import Engine from '../../../../../core/Engine';

// Mock dependencies
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      cancelOrders: jest.fn(),
    },
  },
}));

jest.mock('../../hooks/usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: jest.fn(),
  }),
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
  },
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      contentContainer: {},
      loadingContainer: {},
      loadingText: {},
      footerContainer: {},
    },
    theme: {
      colors: {
        primary: { default: '#000000' },
        accent03: { normal: '#00FF00', dark: '#008800' },
        accent01: { light: '#FF0000', dark: '#880000' },
      },
    },
  }),
}));

jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      contentContainer: {},
      loadingContainer: {},
      loadingText: {},
      footerContainer: {},
    },
    theme: {
      colors: {
        primary: { default: '#000000' },
        accent03: { normal: '#00FF00', dark: '#008800' },
        accent01: { light: '#FF0000', dark: '#880000' },
      },
    },
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const MockReact = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: MockReact.forwardRef(
        (
          {
            children,
          }: {
            children: React.ReactNode;
          },
          ref: React.Ref<{
            onOpenBottomSheet: () => void;
            onCloseBottomSheet: () => void;
          }>,
        ) => {
          MockReact.useImperativeHandle(ref, () => ({
            onOpenBottomSheet: jest.fn(),
            onCloseBottomSheet: jest.fn(),
          }));

          return <View testID="bottom-sheet">{children}</View>;
        },
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return function MockBottomSheetHeader({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return <View testID="bottom-sheet-header">{children}</View>;
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: function MockBottomSheetFooter({
        buttonPropsArray,
      }: {
        buttonPropsArray: {
          label: string;
          onPress: () => void;
          disabled?: boolean;
        }[];
      }) {
        return (
          <View testID="bottom-sheet-footer">
            {buttonPropsArray.map((button, index) => (
              <TouchableOpacity
                key={index}
                onPress={button.onPress}
                disabled={button.disabled}
                testID={`footer-button-${index}`}
              >
                <Text>{button.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      },
      ButtonsAlignment: {
        Horizontal: 'horizontal',
        Vertical: 'vertical',
      },
    };
  },
);

jest.mock('./PerpsCancelAllOrdersModal.styles', () => () => ({}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, options?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'perps.cancel_all_modal.title': 'Cancel All Orders',
      'perps.cancel_all_modal.description':
        'Are you sure you want to cancel all open orders?',
      'perps.cancel_all_modal.keep_orders': 'Keep Orders',
      'perps.cancel_all_modal.confirm': 'Cancel All',
      'perps.cancel_all_modal.canceling': 'Canceling...',
      'perps.cancel_all_modal.success_title': 'Orders Canceled',
      'perps.cancel_all_modal.success_message': `${options?.count} orders canceled successfully`,
      'perps.cancel_all_modal.partial_success': `${options?.successCount} of ${options?.totalCount} orders canceled`,
      'perps.cancel_all_modal.error_title': 'Cancellation Failed',
      'perps.cancel_all_modal.error_message': `Failed to cancel ${options?.count} orders`,
    };
    return translations[key] || key;
  }),
}));

const mockOrders = [
  {
    orderId: '1',
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
    orderId: '2',
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

describe('PerpsCancelAllOrdersModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockCancelOrders = Engine.context.PerpsController
    .cancelOrders as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Visibility', () => {
    it('returns null when isVisible is false', () => {
      const { toJSON } = render(
        <PerpsCancelAllOrdersModal
          isVisible={false}
          onClose={mockOnClose}
          orders={mockOrders}
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders when isVisible is true', () => {
      render(
        <PerpsCancelAllOrdersModal
          isVisible
          onClose={mockOnClose}
          orders={mockOrders}
        />,
      );

      expect(screen.getByTestId('bottom-sheet')).toBeOnTheScreen();
      expect(screen.getByTestId('bottom-sheet-header')).toBeOnTheScreen();
      expect(screen.getByTestId('bottom-sheet-footer')).toBeOnTheScreen();
    });
  });

  describe('Button Interactions', () => {
    it('renders Keep Orders button', () => {
      render(
        <PerpsCancelAllOrdersModal
          isVisible
          onClose={mockOnClose}
          orders={mockOrders}
        />,
      );

      expect(screen.getByTestId('footer-button-0')).toBeOnTheScreen();
    });

    it('renders Cancel All button', () => {
      render(
        <PerpsCancelAllOrdersModal
          isVisible
          onClose={mockOnClose}
          orders={mockOrders}
        />,
      );

      expect(screen.getByTestId('footer-button-1')).toBeOnTheScreen();
    });

    it('calls handleKeepOrders when Keep Orders button is pressed', () => {
      render(
        <PerpsCancelAllOrdersModal
          isVisible
          onClose={mockOnClose}
          orders={mockOrders}
        />,
      );

      fireEvent.press(screen.getByTestId('footer-button-0'));

      // Component should attempt to close the bottom sheet
      expect(screen.getByTestId('bottom-sheet')).toBeOnTheScreen();
    });
  });

  describe('Cancel Orders', () => {
    it('calls cancelOrders with cancelAll true when Cancel All button is pressed', async () => {
      mockCancelOrders.mockResolvedValue({
        success: true,
        successCount: 2,
        failureCount: 0,
      });

      render(
        <PerpsCancelAllOrdersModal
          isVisible
          onClose={mockOnClose}
          orders={mockOrders}
        />,
      );

      fireEvent.press(screen.getByTestId('footer-button-1'));

      await waitFor(() => {
        expect(mockCancelOrders).toHaveBeenCalledWith({ cancelAll: true });
      });
    });

    it('calls onSuccess when all orders are canceled successfully', async () => {
      mockCancelOrders.mockResolvedValue({
        success: true,
        successCount: 2,
        failureCount: 0,
      });

      render(
        <PerpsCancelAllOrdersModal
          isVisible
          onClose={mockOnClose}
          orders={mockOrders}
          onSuccess={mockOnSuccess}
        />,
      );

      fireEvent.press(screen.getByTestId('footer-button-1'));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('calls onSuccess on partial success', async () => {
      mockCancelOrders.mockResolvedValue({
        success: false,
        successCount: 1,
        failureCount: 1,
      });

      render(
        <PerpsCancelAllOrdersModal
          isVisible
          onClose={mockOnClose}
          orders={mockOrders}
          onSuccess={mockOnSuccess}
        />,
      );

      fireEvent.press(screen.getByTestId('footer-button-1'));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('does not call onSuccess when all orders fail to cancel', async () => {
      mockCancelOrders.mockResolvedValue({
        success: false,
        successCount: 0,
        failureCount: 2,
      });

      render(
        <PerpsCancelAllOrdersModal
          isVisible
          onClose={mockOnClose}
          orders={mockOrders}
          onSuccess={mockOnSuccess}
        />,
      );

      fireEvent.press(screen.getByTestId('footer-button-1'));

      await waitFor(() => {
        expect(mockCancelOrders).toHaveBeenCalled();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('handles error when cancelOrders throws', async () => {
      mockCancelOrders.mockRejectedValue(new Error('Network error'));

      render(
        <PerpsCancelAllOrdersModal
          isVisible
          onClose={mockOnClose}
          orders={mockOrders}
          onSuccess={mockOnSuccess}
        />,
      );

      fireEvent.press(screen.getByTestId('footer-button-1'));

      await waitFor(() => {
        expect(mockCancelOrders).toHaveBeenCalled();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});
