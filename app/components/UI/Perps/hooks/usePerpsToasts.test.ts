import { renderHook, act } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import usePerpsToasts, { PerpsToastOptions } from './usePerpsToasts';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import Routes from '../../../../constants/navigation/Routes';

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
      accent03: { dark: '#000000', normal: '#FFFFFF' },
      accent04: { dark: '#000000', normal: '#FFFFFF' },
      accent01: { dark: '#000000', light: '#FFFFFF' },
    },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  IconSize: {
    Xl: 'xl',
  },
  IconColor: {
    PrimaryDefault: 'primary-default',
  },
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

describe('usePerpsToasts', () => {
  let mockShowToast: jest.Mock;
  let mockCloseToast: jest.Mock;
  let mockNavigate: jest.Mock;
  let mockToastRef: {
    current: { showToast: jest.Mock; closeToast: jest.Mock };
  };

  const mockTransactionId = 'c9a6ab70-8e70-11f0-8de9-353809172f0a';

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
          { label: 'Your Perps account was funded', isBold: true },
          { label: '\n', isBold: false },
          { label: '$100.00 available to trade', isBold: false },
        ]);
      });

      it('returns in progress configuration with processing time', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.inProgress(
            60,
            mockTransactionId,
          );

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hapticsType: NotificationFeedbackType.Warning,
        });
        expect(config.startAccessory).toBeDefined();
        expect(config.closeButtonOptions).toBeDefined();
        expect(config.closeButtonOptions?.label).toBe('Track');
      });

      it('returns in progress configuration without processing time', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.inProgress(
            undefined,
            mockTransactionId,
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
          label: 'Withdrawal initiated',
          isBold: true,
        });
        expect(config.startAccessory).toBeDefined();
        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hapticsType: NotificationFeedbackType.Warning,
        });
      });

      it('returns withdrawal success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.withdrawal.withdrawalSuccess(
            '100',
            'USDC',
          );

        expect(config.labelOptions).toEqual([
          { isBold: true, label: 'Withdrawal confirmed' },
          { isBold: false, label: '\n' },
          {
            isBold: false,
            label: "You'll receive 99.00 USDC on Arbitrum within 5 minutes",
          },
        ]);
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
          label: 'An error occurred during withdrawal',
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
        expect(config.startAccessory).toBeDefined();
        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hapticsType: NotificationFeedbackType.Warning,
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
          iconName: IconName.CheckBold,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'Order filled',
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
      it('returns limit order submitted configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.limit.submitted(
            'long',
            '0.5',
            'ETH',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Long 0.5 ETH',
          isBold: false,
        });
        expect(config.startAccessory).toBeDefined();
        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hapticsType: NotificationFeedbackType.Warning,
        });
      });

      it('returns limit order confirmed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.limit.confirmed(
            'short',
            '1.0',
            'BTC',
          );

        expect(config).toMatchObject({
          iconName: IconName.CheckBold,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'Order placed',
          isBold: true,
        });
      });

      it('returns limit order creation failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.limit.creationFailed(
            'Network error',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Network error',
          isBold: false,
        });
      });
    });

    describe('orderManagement.shared', () => {
      it('returns cancellation in progress configuration with detailed order type', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationInProgress(
            'long',
            '2.5',
            'SOL',
            'Take Profit Limit',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Cancelling take profit limit order',
          isBold: true,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'long 2.5 SOL',
          isBold: false,
        });
        expect(config.startAccessory).toBeDefined();
        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hapticsType: NotificationFeedbackType.Warning,
        });
      });

      it('returns cancellation in progress configuration without detailed order type', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationInProgress(
            'short',
            '1.0',
            'ETH',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Cancelling order',
          isBold: true,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'short 1.0 ETH',
          isBold: false,
        });
        expect(config.startAccessory).toBeDefined();
        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hapticsType: NotificationFeedbackType.Warning,
        });
      });

      it('returns cancellation success configuration with detailed order type and position details', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationSuccess(
            false,
            'Stop Market',
            'long',
            '0.5',
            'BTC',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Stop market order cancelled',
          isBold: true,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'long 0.5 BTC',
          isBold: false,
        });
        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.CheckBold,
          hapticsType: NotificationFeedbackType.Success,
        });
      });

      it('returns cancellation success configuration without detailed order type (non-reduce only)', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationSuccess(
            false,
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Order cancelled',
          isBold: true,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'Funds are available to trade',
          isBold: false,
        });
        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.CheckBold,
          hapticsType: NotificationFeedbackType.Success,
        });
      });

      it('returns cancellation success configuration for reduce only orders', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationSuccess(
            true,
            'Limit Close',
          );

        expect(config.labelOptions).toContainEqual({
          label: 'Limit close order cancelled',
          isBold: true,
        });
        // Should not have the "funds available" message for reduce-only orders
        expect(config.labelOptions).not.toContainEqual({
          label: 'Funds are available to trade',
          isBold: false,
        });
        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.CheckBold,
          hapticsType: NotificationFeedbackType.Success,
        });
      });

      it('returns cancellation failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared
            .cancellationFailed;

        expect(config.labelOptions).toEqual([
          { label: 'Failed to cancel order', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Order still active', isBold: false },
        ]);
        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Warning,
          hapticsType: NotificationFeedbackType.Error,
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
          label: 'Closing position',
          isBold: true,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'long 1.5 ETH',
          isBold: false,
        });
        expect(config.startAccessory).toBeDefined();
        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hapticsType: NotificationFeedbackType.Warning,
        });
      });

      it('returns close full position success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition
            .marketClose.full.closeFullPositionSuccess;

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.CheckBold,
          hapticsType: NotificationFeedbackType.Success,
        });
        expect(config.labelOptions).toEqual([
          { label: 'Position closed', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Funds are available to trade', isBold: false },
        ]);
      });

      it('returns close full position failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition
            .marketClose.full.closeFullPositionFailed;

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Warning,
          hapticsType: NotificationFeedbackType.Error,
        });
        expect(config.labelOptions).toEqual([
          { label: 'Failed to close position', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Your position is still active', isBold: false },
        ]);
      });

      it('returns partial position close in progress configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition.marketClose.partial.closePartialPositionInProgress(
            'short',
            '-0.5',
            'BTC',
          );

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          hapticsType: NotificationFeedbackType.Warning,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'Partially closing position',
          isBold: true,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'short 0.5 BTC',
          isBold: false,
        });
        expect(config.startAccessory).toBeDefined();
      });

      it('returns partial position close success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition
            .marketClose.partial.closePartialPositionSuccess;

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.CheckBold,
          hapticsType: NotificationFeedbackType.Success,
        });
        expect(config.labelOptions).toEqual([
          { label: 'Position partially closed', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Funds are available to trade', isBold: false },
        ]);
      });

      it('returns partial position close failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition
            .marketClose.partial.closePartialPositionFailed;

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Warning,
          hapticsType: NotificationFeedbackType.Error,
        });
        expect(config.labelOptions).toEqual([
          { label: 'Failed to partially close position', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Your position is still active', isBold: false },
        ]);
      });

      it('returns limit close partial position submitted configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition.limitClose.partial.partialPositionCloseSubmitted(
            'long',
            '1.0',
            'ETH',
          );

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.CheckBold,
          hapticsType: NotificationFeedbackType.Success,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'Partial close submitted',
          isBold: true,
        });
        expect(config.labelOptions).toContainEqual({
          label: 'long 1 ETH',
          isBold: false,
        });
      });
    });

    describe('positionManagement.tpsl', () => {
      it('returns update TPSL success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.tpsl
            .updateTPSLSuccess;

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.CheckBold,
          hapticsType: NotificationFeedbackType.Success,
          hasNoTimeout: false,
        });
        expect(config.labelOptions).toEqual([
          { label: 'TP/SL updated successfully', isBold: true },
        ]);
      });

      it('returns update TPSL error configuration with custom error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const customError = 'Network connection failed';
        const config =
          result.current.PerpsToastOptions.positionManagement.tpsl.updateTPSLError(
            customError,
          );

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Warning,
          hapticsType: NotificationFeedbackType.Error,
          hasNoTimeout: false,
        });
        expect(config.labelOptions).toEqual([
          { label: 'Failed to update TP/SL', isBold: true },
          { label: '\n', isBold: false },
          { label: customError, isBold: false },
        ]);
      });

      it('returns update TPSL error configuration with default error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.tpsl.updateTPSLError();

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Warning,
          hapticsType: NotificationFeedbackType.Error,
          hasNoTimeout: false,
        });
        expect(config.labelOptions).toEqual([
          { label: 'Failed to update TP/SL', isBold: true },
          { label: '\n', isBold: false },
          {
            label: {
              description:
                'An unexpected error occurred. Please try again later.',
              retry: 'Retry',
              title: 'Something Went Wrong',
            },
            isBold: false,
          },
        ]);
      });

      it('returns update TPSL error configuration with undefined error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.tpsl.updateTPSLError(
            undefined,
          );

        expect(config).toMatchObject({
          variant: ToastVariants.Icon,
          iconName: IconName.Warning,
          hapticsType: NotificationFeedbackType.Error,
          hasNoTimeout: false,
        });
        expect(config.labelOptions).toEqual([
          { label: 'Failed to update TP/SL', isBold: true },
          { label: '\n', isBold: false },
          {
            label: {
              description:
                'An unexpected error occurred. Please try again later.',
              retry: 'Retry',
              title: 'Something Went Wrong',
            },
            isBold: false,
          },
        ]);
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
          { label: 'Order validation failed', isBold: true },
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
          label: 'DOGE is not a tradable asset',
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
          mockTransactionId,
        );
      const errorToast =
        result.current.PerpsToastOptions.accountManagement.deposit.error;

      expect(successToast.hapticsType).toBe(NotificationFeedbackType.Success);
      expect(inProgressToast.hapticsType).toBe(
        NotificationFeedbackType.Warning,
      );
      expect(inProgressToast.startAccessory).toBeDefined();
      expect(inProgressToast.closeButtonOptions).toBeDefined();
      expect(errorToast.hapticsType).toBe(NotificationFeedbackType.Error);
    });
  });
});
