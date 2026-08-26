import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { playNotification, NotificationMoment } from '../../../../util/haptics';
import usePerpsToasts, { PerpsToastOptions } from './usePerpsToasts';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../util/haptics');

jest.mock('../../../../util/theme', () => {
  const { mockTheme: actualMockTheme } = jest.requireActual(
    '../../../../util/theme',
  );
  return {
    mockTheme: actualMockTheme,
    useAppThemeFromContext: jest.fn(() => actualMockTheme),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
    Spinner: 'Spinner',
  };
});

let mockTransactionsRedesignEnabled = false;
let mockDepositMeta: { chainId: string } | undefined;

jest.mock(
  '../../../../selectors/featureFlagController/activityRedesign',
  () => ({
    selectIsTransactionsRedesignEnabled: jest.fn(
      () => mockTransactionsRedesignEnabled,
    ),
  }),
);

jest.mock('../../../../selectors/transactionController', () => ({
  selectTransactionMetadataById: jest.fn(() => mockDepositMeta),
}));

jest.mock('../../../../store', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

jest.mock('../utils/translatePerpsError', () => ({
  handlePerpsError: ({
    error,
    fallbackMessage,
  }: {
    error?: string;
    fallbackMessage: string;
  }) => error || fallbackMessage,
}));

describe('usePerpsToasts', () => {
  let mockNavigate: jest.Mock;

  const mockTransactionId = 'c9a6ab70-8e70-11f0-8de9-353809172f0a';

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransactionsRedesignEnabled = false;
    mockDepositMeta = undefined;
    mockNavigate = jest.fn();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('showToast function', () => {
    it('calls toast and triggers haptic feedback', () => {
      const { result } = renderHook(() => usePerpsToasts());
      const testConfig = {
        severity: ToastSeverity.Success,
        hapticsType: NotificationMoment.Success,
        title: 'Test',
        hasNoTimeout: false,
      } as unknown as PerpsToastOptions;

      act(() => {
        result.current.showToast(testConfig);
      });

      expect(toast).toHaveBeenCalledWith({
        severity: ToastSeverity.Success,
        title: 'Test',
        hasNoTimeout: false,
      });
      expect(playNotification).toHaveBeenCalledWith(NotificationMoment.Success);
    });

    it('passes retryable withdrawal start failed toast options to toast', () => {
      const onRetry = jest.fn();
      const { result } = renderHook(() => usePerpsToasts());
      const config =
        result.current.PerpsToastOptions.accountManagement.withdrawal.withdrawalStartFailed(
          onRetry,
        );

      act(() => {
        result.current.showToast(config);
      });

      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ToastSeverity.Danger,
          actionButtonLabel: 'Try again',
          actionButtonOnPress: onRetry,
        }),
      );
      expect(playNotification).toHaveBeenCalledWith(NotificationMoment.Error);
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
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
          hasNoTimeout: false,
        });
        expect(config.title).toBe('Your Perps account was funded');
        expect(config.description).toBe('$100 available to trade');
      });

      it('returns in progress configuration with processing time', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.inProgress(
            60,
            mockTransactionId,
          );

        expect(config).toMatchObject({
          hapticsType: NotificationMoment.Warning,
        });
        expect(config.startAccessory).toBeTruthy();
        expect(config.actionButtonLabel).toBe('Track');
        expect(typeof config.actionButtonOnPress).toBe('function');
      });

      it('tracks to the redesigned details screen when the redesign is enabled', () => {
        mockTransactionsRedesignEnabled = true;
        mockDepositMeta = { chainId: '0xa4b1' };
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.inProgress(
            60,
            mockTransactionId,
          );

        act(() => {
          config.actionButtonOnPress?.();
        });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.ACTIVITY_DETAILS, {
          chainId: 'eip155:42161',
          txIdentifier: mockTransactionId,
        });
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.TRANSACTION_DETAILS,
          expect.anything(),
        );
      });

      it('tracks to the legacy details screen when the redesign is disabled', () => {
        mockDepositMeta = { chainId: '0xa4b1' };
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.inProgress(
            60,
            mockTransactionId,
          );

        act(() => {
          config.actionButtonOnPress?.();
        });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTION_DETAILS, {
          transactionId: mockTransactionId,
        });
      });

      it('returns in progress configuration without processing time', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.inProgress(
            undefined,
            mockTransactionId,
          );

        expect(config.description).toBe('Funds will be available momentarily');
      });

      it('returns error configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.deposit.error;

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
        });
      });
    });

    describe('accountManagement.withdrawal', () => {
      it('returns withdrawal in progress configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.withdrawal
            .withdrawalInProgress;

        expect(config.title).toBe('Withdrawal initiated');
        expect(config.startAccessory).toBeTruthy();
        expect(config).toMatchObject({
          hapticsType: NotificationMoment.Warning,
        });
      });

      it('returns withdrawal success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.withdrawal.withdrawalSuccess(
            '100',
            'USDC',
          );

        expect(config.title).toBe('Withdrawal confirmed');
        expect(config.description).toBe(
          "You'll receive 99.00 USDC on Arbitrum within 5 minutes",
        );
      });

      it('returns withdrawal failed configuration with custom error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.withdrawal.withdrawalFailed(
            'Custom error',
          );

        expect(config.description).toBe('Custom error');
      });

      it('returns withdrawal failed configuration with default error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.withdrawal.withdrawalFailed();

        expect(config.description).toBe('An error occurred during withdrawal');
      });

      it('returns withdrawal start failed configuration with retry action', () => {
        const onRetry = jest.fn();
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.accountManagement.withdrawal.withdrawalStartFailed(
            onRetry,
          );

        expect(config.title).toBe('Something went wrong');
        expect(config.description).toBe('Your withdrawal wasn’t started.');
        expect(config.actionButtonLabel).toBe('Try again');
        expect(config.actionButtonOnPress).toBe(onRetry);
        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
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

        expect(config.title).toBe('Order submitted');
        expect(config.description).toBe('Long 0.5 ETH');
        expect(config.startAccessory).toBeTruthy();
        expect(config).toMatchObject({
          hapticsType: NotificationMoment.Warning,
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
          severity: ToastSeverity.Success,
        });
        expect(config.title).toBe('Order filled');
      });

      it('returns market order creation failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.market.creationFailed(
            'Network error',
          );

        expect(config.description).toBe('Network error');
      });

      it('strips hip3 prefix from asset symbol in market order submitted', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.market.submitted(
            'long',
            '0.5',
            'hip3:BTC',
          );

        expect(config.description).toBe('Long 0.5 BTC');
      });

      it('strips DEX prefix from asset symbol in market order confirmed', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.market.confirmed(
            'short',
            '10',
            'xyz:TSLA',
          );

        expect(config.description).toBe('Short 10 TSLA');
      });

      it('keeps regular asset symbols unchanged in market orders', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.market.submitted(
            'long',
            '2',
            'SOL',
          );

        expect(config.description).toBe('Long 2 SOL');
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

        expect(config.title).toBe('Order submitted');
        expect(config.description).toBe('Long 0.5 ETH');
        expect(config.startAccessory).toBeTruthy();
        expect(config).toMatchObject({
          hapticsType: NotificationMoment.Warning,
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
          severity: ToastSeverity.Success,
        });
        expect(config.title).toBe('Order placed');
      });

      it('returns limit order creation failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.limit.creationFailed(
            'Network error',
          );

        expect(config.description).toBe('Network error');
      });

      it('strips hip3 prefix from asset symbol in limit order submitted', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.limit.submitted(
            'short',
            '1.5',
            'hip3:ETH',
          );

        expect(config.description).toBe('Short 1.5 ETH');
      });

      it('strips DEX prefix from asset symbol in limit order confirmed', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.limit.confirmed(
            'long',
            '100',
            'abc:AAPL',
          );

        expect(config.description).toBe('Long 100 AAPL');
      });

      it('keeps regular asset symbols unchanged in limit orders', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.limit.submitted(
            'long',
            '5',
            'BTC',
          );

        expect(config.description).toBe('Long 5 BTC');
      });
    });

    describe('orderManagement.shared', () => {
      it('returns submitting your trade configuration with dismiss option', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.submitting();

        expect(config.title).toBe('Submitting your trade');
        expect(config.hasNoTimeout).toBe(true);
        expect(config).toMatchObject({
          hapticsType: NotificationMoment.Warning,
        });
      });

      it('returns cancellation in progress configuration with detailed order type', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationInProgress(
            'long',
            '2.5',
            'SOL',
            'Take Profit Limit',
          );

        expect(config.title).toBe('Cancelling take profit limit order');
        expect(config.description).toBe('long 2.5 SOL');
        expect(config.startAccessory).toBeTruthy();
        expect(config).toMatchObject({
          hapticsType: NotificationMoment.Warning,
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

        expect(config.title).toBe('Cancelling order');
        expect(config.description).toBe('short 1.0 ETH');
        expect(config.startAccessory).toBeTruthy();
        expect(config).toMatchObject({
          hapticsType: NotificationMoment.Warning,
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

        expect(config.title).toBe('Stop market order cancelled');
        expect(config.description).toBe('long 0.5 BTC');
        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
        });
      });

      it('returns cancellation success configuration without detailed order type (non-reduce only)', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationSuccess(
            false,
          );

        expect(config.title).toBe('Order cancelled');
        expect(config.description).toBe('Funds are available to trade');
        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
        });
      });

      it('returns cancellation success configuration for reduce only orders', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationSuccess(
            true,
            'Limit Close',
          );

        expect(config.title).toBe('Limit close order cancelled');
        // Should not have the "funds available" message for reduce-only orders
        expect(config.description).not.toBe('Funds are available to trade');
        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
        });
      });

      it('returns cancellation failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared
            .cancellationFailed;

        expect(config.title).toBe('Failed to cancel order');
        expect(config.description).toBe('Order still active');
        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
        });
      });

      it('returns cancel all success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancelAllSuccess(
            3,
          );

        expect(config.title).toBe('Orders canceled');
        expect(config.description).toBe('Successfully canceled 3 order(s)');
        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
        });
      });

      it('returns cancel all partial success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancelAllPartialSuccess(
            2,
            5,
          );

        expect(config.title).toBe('Orders canceled');
        expect(config.description).toBe('Canceled 2 of 5 orders');
        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
        });
      });

      it('returns cancel all failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancelAllFailed(
            'Network error',
          );

        expect(config.title).toBe('Failed to cancel orders');
        expect(config.description).toBe('Network error');
        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
        });
      });

      it('returns cancel all failed configuration with default error message', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancelAllFailed();

        expect(config.title).toBe('Failed to cancel orders');
        expect(config.description).toBe('Unknown error');
        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
        });
      });

      it('strips hip3 prefix from asset symbol in cancellation in progress', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationInProgress(
            'long',
            '3',
            'hip3:SOL',
            'Stop Loss',
          );

        expect(config.description).toBe('long 3 SOL');
      });

      it('strips DEX prefix from asset symbol in cancellation success', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationSuccess(
            false,
            'Take Profit',
            'short',
            '50',
            'xyz:TSLA',
          );

        expect(config.description).toBe('short 50 TSLA');
      });

      it('keeps regular asset symbols unchanged in cancellation', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.orderManagement.shared.cancellationInProgress(
            'long',
            '1.5',
            'ETH',
          );

        expect(config.description).toBe('long 1.5 ETH');
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

        expect(config.title).toBe('Closing position');
        expect(config.description).toBe('long 1.5 ETH');
        expect(config.startAccessory).toBeTruthy();
        expect(config).toMatchObject({
          hapticsType: NotificationMoment.Warning,
        });
      });

      it('returns close full position success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const mockPosition = {
          symbol: 'ETH',
          size: '1.5',
          unrealizedPnl: '100',
          returnOnEquity: '0.15',
        } as never;

        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition.marketClose.full.closeFullPositionSuccess(
            mockPosition,
          );

        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
        });
        expect(config.title).toBe('Position closed');
        expect(config.actionButtonLabel).toBeDefined();
        expect(typeof config.actionButtonOnPress).toBe('function');
      });

      it('returns close full position failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition
            .marketClose.full.closeFullPositionFailed;

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
        });
        expect(config.title).toBe('Failed to close position');
        expect(config.description).toBe('Your position is still active');
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
          hapticsType: NotificationMoment.Warning,
        });
        expect(config.title).toBe('Partially closing position');
        expect(config.description).toBe('short 0.5 BTC');
        expect(config.startAccessory).toBeTruthy();
      });

      it('returns partial position close success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const mockPosition = {
          symbol: 'BTC',
          size: '-0.5',
          unrealizedPnl: '50',
          returnOnEquity: '0.08',
        } as never;

        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition.marketClose.partial.closePartialPositionSuccess(
            mockPosition,
          );

        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
        });
        expect(config.title).toBe('Position partially closed');
        expect(config.actionButtonLabel).toBeDefined();
        expect(typeof config.actionButtonOnPress).toBe('function');
      });

      it('returns partial position close failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition
            .marketClose.partial.closePartialPositionFailed;

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
        });
        expect(config.title).toBe('Failed to partially close position');
        expect(config.description).toBe('Your position is still active');
      });

      it('returns limit close full position submitted configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition.limitClose.full.fullPositionCloseSubmitted(
            'long',
            '1.0',
            'ETH',
          );

        // Terminal toast (no follow-up), so it uses the success/green-tick
        // style rather than an in-progress spinner that never resolves.
        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
        });
        expect(config.startAccessory).toBeUndefined();
        expect(config.title).toBe('Placed order to close position');
        expect(config.description).toBe('long 1 ETH');
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
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
        });
        expect(config.title).toBe('Partial close submitted');
        expect(config.description).toBe('long 1 ETH');
      });

      it('returns limit close full position failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition
            .limitClose.full.fullPositionCloseFailed;

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
        });
        expect(config.title).toBe('Failed to place close order');
        expect(config.description).toBe('Your position is still active');
      });

      it('returns limit close partial position failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.closePosition
            .limitClose.partial.partialPositionCloseFailed;

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
        });
        expect(config.title).toBe('Failed to place partial close order');
        expect(config.description).toBe('Your position is still active');
      });
    });

    describe('positionManagement.margin', () => {
      it('returns add margin success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.margin.addSuccess(
            'ETH',
            '100',
          );

        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
          hasNoTimeout: false,
        });
        expect(config.title).toEqual(expect.any(String));
      });

      it('returns remove margin success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.margin.removeSuccess(
            'BTC',
            '50',
          );

        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
          hasNoTimeout: false,
        });
        expect(config.title).toEqual(expect.any(String));
      });

      it('returns adjustment failed configuration with custom error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const customError = 'Insufficient funds';
        const config =
          result.current.PerpsToastOptions.positionManagement.margin.adjustmentFailed(
            customError,
          );

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
          hasNoTimeout: false,
        });
        expect(config.title).toEqual(expect.any(String));
        expect(config.description).toBe(customError);
      });

      it('returns adjustment failed configuration with default error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.margin.adjustmentFailed();

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
          hasNoTimeout: false,
        });
        expect(config.title).toEqual(expect.any(String));
        expect(config.description).toEqual(expect.any(String));
      });
    });

    describe('positionManagement.tpsl', () => {
      it('returns update TPSL success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.tpsl
            .updateTPSLSuccess;

        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
          hasNoTimeout: false,
        });
        expect(config.title).toBe('TP/SL updated successfully');
      });

      it('returns update TPSL error configuration with custom error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const customError = 'Network connection failed';
        const config =
          result.current.PerpsToastOptions.positionManagement.tpsl.updateTPSLError(
            customError,
          );

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
          hasNoTimeout: false,
        });
        expect(config.title).toBe('Failed to update TP/SL');
        expect(config.description).toBe(customError);
      });

      it('returns update TPSL error configuration with default error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.tpsl.updateTPSLError();

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
          hasNoTimeout: false,
        });
        expect(config.title).toBe('Failed to update TP/SL');
        expect(config.description).toBe(
          'Unable to update take profit/stop loss. Please try again.',
        );
      });

      it('returns update TPSL error configuration with undefined error', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.positionManagement.tpsl.updateTPSLError(
            undefined,
          );

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
          hasNoTimeout: false,
        });
        expect(config.title).toBe('Failed to update TP/SL');
        expect(config.description).toBe(
          'Unable to update take profit/stop loss. Please try again.',
        );
      });
    });

    describe('formValidation.orderForm', () => {
      it('returns validation error configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());
        const config =
          result.current.PerpsToastOptions.formValidation.orderForm.validationError(
            'Insufficient balance',
          );

        expect(config.title).toBe('Order validation failed');
        expect(config.description).toBe('Insufficient balance');
      });
    });

    describe('dataFetching.market', () => {
      it('returns market data unavailable configuration with navigation', () => {
        const { result } = renderHook(() => usePerpsToasts());

        const config =
          result.current.PerpsToastOptions.dataFetching.market.error.marketDataUnavailable(
            'DOGE',
          );

        expect(config.description).toBe('DOGE is not a tradable asset');
        expect(config.actionButtonLabel).toBe('Go back');

        // Test navigation handler
        act(() => {
          config.actionButtonOnPress?.();
        });

        expect(toast.dismiss).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT);
      });
    });

    describe('contentSharing.pnlHeroCard', () => {
      it('returns share success configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());

        const config =
          result.current.PerpsToastOptions.contentSharing.pnlHeroCard
            .shareSuccess;

        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
          hasNoTimeout: false,
        });
        expect(config.title).toBe('Exported image');
      });

      it('returns share failed configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());

        const config =
          result.current.PerpsToastOptions.contentSharing.pnlHeroCard
            .shareFailed;

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
          hasNoTimeout: false,
        });
        expect(config.title).toBe('Failed to export image');
      });
    });

    describe('watchlist', () => {
      it('returns added configuration for the given symbol', () => {
        const { result } = renderHook(() => usePerpsToasts());

        const config = result.current.PerpsToastOptions.watchlist.added('BTC');

        expect(config).toMatchObject({
          severity: ToastSeverity.Success,
          hapticsType: NotificationMoment.Success,
          hasNoTimeout: false,
        });
        expect(config.title).toBe('Added BTC to watchlist');
      });

      it('returns removed configuration for the given symbol', () => {
        const { result } = renderHook(() => usePerpsToasts());

        const config =
          result.current.PerpsToastOptions.watchlist.removed('ETH');

        expect(config).toMatchObject({
          severity: ToastSeverity.Default,
          hapticsType: NotificationMoment.Warning,
          hasNoTimeout: false,
        });
        expect(config.title).toBe('Removed ETH from watchlist');
      });

      it('strips the dex prefix from HIP-3 market symbols', () => {
        const { result } = renderHook(() => usePerpsToasts());

        expect(
          result.current.PerpsToastOptions.watchlist.added('somedex:BTC').title,
        ).toBe('Added BTC to watchlist');
        expect(
          result.current.PerpsToastOptions.watchlist.removed('somedex:ETH')
            .title,
        ).toBe('Removed ETH from watchlist');
      });

      it('returns add error configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());

        const config = result.current.PerpsToastOptions.watchlist.addError;

        expect(config).toMatchObject({
          severity: ToastSeverity.Danger,
          hapticsType: NotificationMoment.Error,
        });
        expect(config.title).toBe('Failed to add market to watchlist');
      });

      it('returns limit reached configuration', () => {
        const { result } = renderHook(() => usePerpsToasts());

        const config = result.current.PerpsToastOptions.watchlist.limitReached;

        expect(config).toMatchObject({
          severity: ToastSeverity.Default,
        });
        expect(config.title).toContain('Watchlist limit reached');
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
        severity: ToastSeverity.Success,
      });
      expect(errorConfig).toMatchObject({
        severity: ToastSeverity.Danger,
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

      expect(successToast.hapticsType).toBe(NotificationMoment.Success);
      expect(inProgressToast.hapticsType).toBe(NotificationMoment.Warning);
      expect(inProgressToast.startAccessory).toBeTruthy();
      expect(inProgressToast.actionButtonLabel).toBe('Track');
      expect(errorToast.hapticsType).toBe(NotificationMoment.Error);
    });
  });
});
