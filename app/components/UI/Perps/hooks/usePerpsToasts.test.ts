import { renderHook, act } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import usePerpsToasts, { PerpsToastOptions } from './usePerpsToasts';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';

// Mock dependencies
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: () => ({
    colors: {
      icon: { default: '#000000' },
      primary: { default: '#0376C9' },
      background: { default: '#FFFFFF' },
      error: { default: '#D73A49' },
    },
  }),
}));

jest.mock('../utils/perpsErrorHandler', () => ({
  handlePerpsError: ({
    error,
    fallbackMessage,
  }: {
    error?: string;
    fallbackMessage: string;
  }) => error || fallbackMessage,
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const mockStrings: Record<string, string> = {
      'perps.deposit.success_toast': 'Deposit Successful',
      'perps.deposit.success_message': `${params?.amount} deposited`,
      'perps.deposit.in_progress': 'Deposit in Progress',
      'perps.deposit.funds_available_momentarily':
        'Funds will be available momentarily',
      'perps.deposit.estimated_processing_time': `Processing time: ${params?.time}`,
      'perps.deposit.error_toast': 'Deposit Failed',
      'perps.deposit.error_generic': 'Something went wrong',
      'perps.withdrawal.processing_title': 'Withdrawal Processing',
      'perps.withdrawal.eta_will_be_shared_shortly':
        'ETA will be shared shortly',
      'perps.withdrawal.success_toast': 'Withdrawal Successful',
      'perps.withdrawal.arrival_time': `${params?.amount} ${params?.symbol} withdrawn`,
      'perps.withdrawal.error': 'Withdrawal Failed',
      'perps.withdrawal.error_generic': 'Unable to process withdrawal',
      'perps.order.order_submitted': 'Order Submitted',
      'perps.order.order_placement_subtitle': `${params?.direction} ${params?.amount} ${params?.assetSymbol}`,
      'perps.order.order_filled': 'Order Filled',
      'perps.order.order_placed': 'Order Placed',
      'perps.order.order_failed': 'Order Failed',
      'perps.order.your_funds_have_been_returned_to_you':
        'Your funds have been returned',
      'perps.order.cancelling_order': 'Cancelling Order',
      'perps.order.cancelling_order_subtitle': `Cancelling ${params?.direction} ${params?.amount} ${params?.assetSymbol}`,
      'perps.order.order_cancelled': 'Order Cancelled',
      'perps.order.funds_are_available_to_trade':
        'Funds are available to trade',
      'perps.order.failed_to_cancel_order': 'Failed to Cancel Order',
      'perps.close_position.limit_close_order_cancelled':
        'Limit close order cancelled',
      'perps.order.close_order_still_active': 'Close order is still active',
      'perps.close_position.closing_position': 'Closing Position',
      'perps.close_position.your_funds_will_be_available_momentarily':
        'Your funds will be available momentarily',
      'perps.close_position.closing_position_subtitle': `Closing ${params?.direction} ${params?.amount} ${params?.assetSymbol}`,
      'perps.close_position.position_closed': 'Position Closed',
      'perps.close_position.funds_are_available_to_trade':
        'Funds are available to trade',
      'perps.close_position.partially_closing_position':
        'Partially Closing Position',
      'perps.close_position.position_close_order_placed':
        'Position Close Order Placed',
      'perps.close_position.partial_close_submitted': 'Partial Close Submitted',
      'perps.order.validation.failed': 'Validation Failed',
      'perps.order.error.invalid_asset': 'Invalid Asset',
      'perps.order.error.asset_not_tradable': `${params?.asset} is not tradable`,
      'perps.order.error.go_back': 'Go Back',
    };
    return mockStrings[key] || key;
  }),
}));

describe('usePerpsToasts', () => {
  let mockShowToast: jest.Mock;
  let mockCloseToast: jest.Mock;
  let mockNavigate: jest.Mock;
  let mockToastRef: {
    current: { showToast: jest.Mock; closeToast: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockShowToast = jest.fn();
    mockCloseToast = jest.fn();
    mockNavigate = jest.fn();

    mockToastRef = {
      current: {
        showToast: mockShowToast,
        closeToast: mockCloseToast,
      },
    };

    (useContext as jest.Mock).mockReturnValue({ toastRef: mockToastRef });
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
  });

  describe('showToast function', () => {
    it('calls toastRef showToast and triggers haptic feedback', () => {
      const { result } = renderHook(() => usePerpsToasts());

      const testConfig = {
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [{ label: 'Test', isBold: true }],
      };

      act(() => {
        result.current.showToast(testConfig as PerpsToastOptions);
      });

      expect(mockShowToast).toHaveBeenCalledWith(testConfig);
      expect(notificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Success,
      );
    });
  });

  describe('PerpsToastOptions configurations', () => {
    describe('accountManagement.deposit', () => {
      it('returns success configuration with formatted amount', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.success(
            '100 USDC',
          );

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.CheckBold,
          hapticsType: NotificationFeedbackType.Success,
          hasNoTimeout: false,
        });
        expect(config.labelOptions).toEqual([
          { label: 'Deposit Successful', isBold: true },
          { label: '\n', isBold: false },
          { label: '100 USDC deposited', isBold: false },
        ]);
      });

      it('returns in progress configuration with processing time', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.inProgress(
            60,
          );

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hapticsType: NotificationFeedbackType.Warning,
        });
        expect(strings).toHaveBeenCalledWith(
          'perps.deposit.estimated_processing_time',
          { time: expect.any(String) },
        );
      });

      it('returns in progress configuration without processing time', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.inProgress(
            undefined,
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Funds will be available momentarily',
          isBold: false,
        });
      });

      it('returns error configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.error;

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Warning,
          hapticsType: NotificationFeedbackType.Error,
        });
      });
    });

    describe('accountManagement.withdrawal', () => {
      it('returns withdrawal in progress configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.withdrawal
            .withdrawalInProgress;

        expect(config.labelOptions).toContainEqual({
          label: 'Withdrawal Processing',
          isBold: true,
        });
      });

      it('returns withdrawal success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.withdrawal.withdrawalSuccess(
            '100',
            'USDC',
          );

        expect(config.labelOptions).toContainEqual({
          label: '100 USDC withdrawn',
          isBold: false,
        });
      });

      it('returns withdrawal failed configuration with custom error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.withdrawal.withdrawalFailed(
            'Custom error',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Custom error',
          isBold: false,
        });
      });

      it('returns withdrawal failed configuration with default error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.withdrawal.withdrawalFailed();

        expect(config.labelOptions).toContainEqual({
          label: 'Unable to process withdrawal',
          isBold: false,
        });
      });
    });

    describe('orderManagement.market', () => {
      it('returns market order submitted configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.market.submitted(
            'long',
            '0.5',
            'ETH',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Long 0.5 ETH',
          isBold: false,
        });
      });

      it('returns market order confirmed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.market.confirmed(
            'short',
            '1.0',
            'BTC',
          );

        expect(config).toMatchObject({
          iconName: IconName.Check,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'Order Filled',
          isBold: true,
        });
      });

      it('returns market order creation failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.market.creationFailed(
            'Network error',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Network error',
          isBold: false,
        });
      });
    });

    describe('orderManagement.limit', () => {
      it('returns limit order cancellation in progress configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.limit.cancellationInProgress(
            'long',
            '2.5',
            'SOL',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Cancelling Order',
          isBold: true,
        });
      });

      it('returns limit order cancellation success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.limit
            .cancellationSuccess;

        expect(config.labelOptions).toContainEqual({
          label: 'Funds are available to trade',
          isBold: false,
        });
      });

      it('returns reduce only close cancellation configurations', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const successConfig =
          result.current.PerpsToastOptions.orderManagement.limit.reduceOnlyClose
            .cancellationSuccess;
        const failedConfig =
          result.current.PerpsToastOptions.orderManagement.limit.reduceOnlyClose
            .cancellationFailed;

        expect(successConfig.labelOptions).toContainEqual({
          label: 'Limit close order cancelled',
          isBold: false,
        });
        expect(failedConfig.labelOptions).toContainEqual({
          label: 'Close order is still active',
          isBold: false,
        });
      });
    });

    describe('positionManagement.closePosition', () => {
      it('returns close full position in progress configuration with details', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition.marketClose.full.closeFullPositionInProgress(
            'long',
            '1.5',
            'ETH',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Closing Position',
          isBold: true,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'Closing long 1.5 ETH',
          isBold: false,
        });
      });

      it('returns close full position success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition
            .marketClose.full.closeFullPositionSuccess;

        expect(config.labelOptions).toContainEqual({
          label: 'Position Closed',
          isBold: true,
        });
      });

      it('returns partial position close configurations', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const marketConfig =
          result.current.PerpsToastOptions.positionManagement.closePosition.marketClose.partial.closePartialPositionInProgress(
            'short',
            '-0.5',
            'BTC',
          );
        const limitConfig =
          result.current.PerpsToastOptions.positionManagement.closePosition.limitClose.partial.partialPositionCloseSubmitted(
            'long',
            '1.0',
            'ETH',
          );

        expect(marketConfig.labelOptions).toContainEqual({
          label: 'Partially Closing Position',
          isBold: true,
        });
        expect(limitConfig.labelOptions).toContainEqual({
          label: 'Partial Close Submitted',
          isBold: true,
        });
      });
    });

    describe('formValidation.orderForm', () => {
      it('returns validation error configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.formValidation.orderForm.validationError(
            'Insufficient balance',
          );

        expect(config.labelOptions).toEqual([
          { label: 'Validation Failed', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Insufficient balance', isBold: false },
        ]);
      });
    });

    describe('dataFetching.market', () => {
      it('returns market data unavailable configuration with navigation', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.dataFetching.market.error.marketDataUnavailable(
            'DOGE',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'DOGE is not tradable',
          isBold: false,
        });
        expect(config.closeButtonOptions).toMatchObject({
          label: 'Go Back',
          variant: ButtonVariants.Secondary,
        });

        // Test navigation handler
        act(() => {
          config.closeButtonOptions?.onPress?.();
        });

        expect(mockCloseToast).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT);
      });
    });
  });

  describe('theme integration', () => {
    it('uses correct icon variants and names in toast configurations', () => {
      const { result } = renderHook(() => usePerpsToasts());

      const successConfig =
        result.current.PerpsToastOptions.accountManagement.deposit.success(
          '100',
        );
      const errorConfig =
        result.current.PerpsToastOptions.accountManagement.deposit.error;

      // Check that the configs use the correct variants and icons
      expect(successConfig).toMatchObject({
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
      });
      expect(errorConfig).toMatchObject({
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
      });
    });
  });

  describe('haptic feedback types', () => {
    it('assigns correct haptic types to different toast variants', () => {
      const { result } = renderHook(() => usePerpsToasts());

      const successToast =
        result.current.PerpsToastOptions.accountManagement.deposit.success(
          '100',
        );
      const inProgressToast =
        result.current.PerpsToastOptions.accountManagement.deposit.inProgress(
          30,
        );
      const errorToast =
        result.current.PerpsToastOptions.accountManagement.deposit.error;

      expect(successToast.hapticsType).toBe(NotificationFeedbackType.Success);
      expect(inProgressToast.hapticsType).toBe(
        NotificationFeedbackType.Warning,
      );
      expect(errorToast.hapticsType).toBe(NotificationFeedbackType.Error);
    });
  });
});
