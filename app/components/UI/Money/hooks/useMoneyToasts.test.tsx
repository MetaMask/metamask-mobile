import { renderHook } from '@testing-library/react-hooks';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { playNotification, NotificationMoment } from '../../../../util/haptics';
import useMoneyToasts from './useMoneyToasts';

jest.mock('../../../../util/haptics');

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

const mockToast = jest.mocked(toast);
const mockDismiss = jest.mocked(toast.dismiss);
const mockPlayNotification = jest.mocked(playNotification);

describe('useMoneyToasts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showToast', () => {
    it('calls toast with success options excluding hapticsType', () => {
      const { result } = renderHook(() => useMoneyToasts());
      const testConfig = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$10.00',
      });

      result.current.showToast(testConfig);

      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ToastSeverity.Success,
          title: 'Conversion complete',
        }),
      );
      expect(mockToast.mock.calls[0][0]).not.toHaveProperty('hapticsType');
      expect(mockToast.mock.calls[0][0]).not.toHaveProperty('onPress');
    });

    it('triggers haptics with the config type', () => {
      const { result } = renderHook(() => useMoneyToasts());

      result.current.showToast(
        result.current.MoneyToastOptions.deposit.success({
          amountFiat: '$10.00',
        }),
      );

      expect(mockPlayNotification).toHaveBeenCalledTimes(1);
      expect(mockPlayNotification).toHaveBeenCalledWith(
        NotificationMoment.Success,
      );
    });

    it('forwards onPress onto title and description text props', () => {
      const { result } = renderHook(() => useMoneyToasts());
      const onPress = jest.fn();
      const testConfig = result.current.MoneyToastOptions.deposit.inProgress({
        onPress,
      });

      result.current.showToast(testConfig);

      const toastOptions = mockToast.mock.calls[0][0];
      expect(toastOptions.titleProps?.onPress).toEqual(expect.any(Function));
      expect(toastOptions.descriptionProps?.onPress).toEqual(
        expect.any(Function),
      );

      toastOptions.titleProps?.onPress?.({} as never);
      expect(mockDismiss).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeToast', () => {
    it('dismisses the design-system toast', () => {
      const { result } = renderHook(() => useMoneyToasts());

      result.current.closeToast();

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('MoneyToastOptions structure', () => {
    it('exposes deposit, withdraw, and send namespaces with all three builders', () => {
      const { result } = renderHook(() => useMoneyToasts());

      expect(result.current.MoneyToastOptions.deposit).toBeDefined();
      expect(result.current.MoneyToastOptions.deposit.inProgress).toBeDefined();
      expect(result.current.MoneyToastOptions.deposit.success).toBeDefined();
      expect(result.current.MoneyToastOptions.deposit.failed).toBeDefined();

      expect(result.current.MoneyToastOptions.withdraw).toBeDefined();
      expect(
        result.current.MoneyToastOptions.withdraw.inProgress,
      ).toBeDefined();
      expect(result.current.MoneyToastOptions.withdraw.success).toBeDefined();
      expect(result.current.MoneyToastOptions.withdraw.failed).toBeDefined();

      expect(result.current.MoneyToastOptions.send).toBeDefined();
      expect(result.current.MoneyToastOptions.send.inProgress).toBeDefined();
      expect(result.current.MoneyToastOptions.send.success).toBeDefined();
      expect(result.current.MoneyToastOptions.send.failed).toBeDefined();
    });
  });

  describe('deposit toasts', () => {
    it('inProgress uses a spinner, Warning haptics and persists until dismissed', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions =
        result.current.MoneyToastOptions.deposit.inProgress();

      expect(toastOptions.hapticsType).toBe(NotificationMoment.Warning);
      expect(toastOptions.hasNoTimeout).toBe(true);
      expect(toastOptions.startAccessory).toBeDefined();
      expect(toastOptions.title).toBe('Converting crypto');
      expect(toastOptions.description).toBe('This may take a few minutes.');
    });

    it('inProgress title is "Adding funds" when intent is addMusd', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.deposit.inProgress({
        intent: 'addMusd',
      });

      expect(toastOptions.title).toBe('Adding funds');
    });

    it('inProgress title/body is "Depositing" / "Card orders may take a few minutes." when intent is card', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.deposit.inProgress({
        intent: 'card',
      });

      expect(toastOptions.title).toBe('Depositing');
      expect(toastOptions.description).toBe(
        'Card orders may take a few minutes.',
      );
    });

    it('success uses Success severity and includes amount in the description', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$25.00',
      });

      expect(toastOptions.severity).toBe(ToastSeverity.Success);
      expect(toastOptions.hapticsType).toBe(NotificationMoment.Success);
      expect(toastOptions.title).toBe('Conversion complete');
      expect(toastOptions.description).toEqual(expect.any(String));
    });

    it('success title is "Funds added" when intent is addMusd', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$25.00',
        intent: 'addMusd',
      });

      expect(toastOptions.title).toBe('Funds added');
    });

    it('success title/body is "Deposit complete" / amount added when intent is card', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$1,000.00',
        intent: 'card',
      });

      expect(toastOptions.title).toBe('Deposit complete');
      expect(toastOptions.description).toBe(
        '$1,000.00 added to Money account.',
      );
    });

    it('failed uses Danger severity', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.deposit.failed();

      expect(toastOptions.severity).toBe(ToastSeverity.Danger);
      expect(toastOptions.hapticsType).toBe(NotificationMoment.Error);
      expect(toastOptions.title).toBe('Conversion failed');
      expect(toastOptions.description).toBe('Unable to convert. Try again.');
    });

    it('failed title/body is "Failed to add funds" / "Unable to add funds. Try again." for addMusd', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.deposit.failed({
        intent: 'addMusd',
      });

      expect(toastOptions.title).toBe('Failed to add funds');
      expect(toastOptions.description).toBe('Unable to add funds. Try again.');
    });

    it('failed title/body is "Deposit failed" / "Unable to add funds. Try again." for card', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.deposit.failed({
        intent: 'card',
      });

      expect(toastOptions.title).toBe('Deposit failed');
      expect(toastOptions.description).toBe('Unable to add funds. Try again.');
    });
  });

  describe('withdraw toasts', () => {
    it('inProgress title/body is "Transfer in progress" / "This may take a few minutes."', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions =
        result.current.MoneyToastOptions.withdraw.inProgress();

      expect(toastOptions.hapticsType).toBe(NotificationMoment.Warning);
      expect(toastOptions.hasNoTimeout).toBe(true);
      expect(toastOptions.title).toBe('Transfer in progress');
      expect(toastOptions.description).toBe('This may take a few minutes.');
    });

    it('success title/body interpolates the destination account name', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.withdraw.success({
        amountFiat: '$50.00',
        destination: 'Account 1',
      });

      expect(toastOptions.severity).toBe(ToastSeverity.Success);
      expect(toastOptions.title).toBe('Transfer complete');
      expect(toastOptions.description).toBe('$50.00 added to Account 1.');
    });

    it('success body falls back to "Added to {{destination}}." when amount is missing', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.withdraw.success({
        destination: 'My main wallet',
      });

      expect(toastOptions.description).toBe('Added to My main wallet.');
    });

    it('failed title/body is "Transfer failed" / "Unable to transfer funds. Try again."', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.withdraw.failed();

      expect(toastOptions.severity).toBe(ToastSeverity.Danger);
      expect(toastOptions.title).toBe('Transfer failed');
      expect(toastOptions.description).toBe(
        'Unable to transfer funds. Try again.',
      );
    });
  });

  describe('send toasts', () => {
    it('inProgress title/body is "Sending funds" / "This may take a few minutes."', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.send.inProgress();

      expect(toastOptions.hapticsType).toBe(NotificationMoment.Warning);
      expect(toastOptions.hasNoTimeout).toBe(true);
      expect(toastOptions.title).toBe('Sending funds');
      expect(toastOptions.description).toBe('This may take a few minutes.');
    });

    it('success title/body interpolates the amount and destination', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.send.success({
        amountFiat: '$50.00',
        destination: 'Perps',
      });

      expect(toastOptions.severity).toBe(ToastSeverity.Success);
      expect(toastOptions.title).toBe('Funds sent');
      expect(toastOptions.description).toBe('$50.00 is available in Perps.');
    });

    it('success body falls back to "Available in {{destination}}." when amount is missing', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.send.success({
        destination: 'Predict',
      });

      expect(toastOptions.description).toBe('Available in Predict.');
    });

    it('failed title/body is "Send failed" / "Unable to send funds. Try again."', () => {
      const { result } = renderHook(() => useMoneyToasts());

      const toastOptions = result.current.MoneyToastOptions.send.failed();

      expect(toastOptions.severity).toBe(ToastSeverity.Danger);
      expect(toastOptions.title).toBe('Send failed');
      expect(toastOptions.description).toBe('Unable to send funds. Try again.');
    });
  });

  describe('onPress', () => {
    it.each([
      ['deposit.inProgress', (onPress: () => void) => ({ onPress })],
      [
        'deposit.success',
        (onPress: () => void) => ({ amountFiat: '$1.00', onPress }),
      ],
      ['deposit.failed', (onPress: () => void) => ({ onPress })],
      ['send.inProgress', (onPress: () => void) => ({ onPress })],
      [
        'send.success',
        (onPress: () => void) => ({
          amountFiat: '$1.00',
          destination: 'Perps',
          onPress,
        }),
      ],
      ['send.failed', (onPress: () => void) => ({ onPress })],
    ])(
      'sets a composed onPress on %s when a callback is provided',
      (key, paramsFactory) => {
        const { result } = renderHook(() => useMoneyToasts());
        const [namespace, builder] = key.split('.') as [
          'deposit' | 'send',
          'inProgress' | 'success' | 'failed',
        ];
        const onPress = jest.fn();

        const toastOptions = result.current.MoneyToastOptions[namespace][
          builder
        ](paramsFactory(onPress) as never);

        expect(toastOptions.onPress).toEqual(expect.any(Function));
      },
    );

    it('closes the toast before invoking the provided callback when onPress fires', () => {
      const { result } = renderHook(() => useMoneyToasts());
      const onPress = jest.fn();

      const toastOptions = result.current.MoneyToastOptions.deposit.inProgress({
        onPress,
      });
      toastOptions.onPress?.();

      expect(mockDismiss).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(mockDismiss.mock.invocationCallOrder[0]).toBeLessThan(
        onPress.mock.invocationCallOrder[0],
      );
    });

    it.each([
      ['deposit.inProgress', () => undefined],
      ['deposit.success', () => ({ amountFiat: '$1.00' })],
      ['deposit.failed', () => undefined],
      ['send.inProgress', () => undefined],
      ['send.success', () => ({ amountFiat: '$1.00', destination: 'Perps' })],
      ['send.failed', () => undefined],
    ])(
      'returns undefined onPress on %s when no callback is provided',
      (key, paramsFactory) => {
        const { result } = renderHook(() => useMoneyToasts());
        const [namespace, builder] = key.split('.') as [
          'deposit' | 'send',
          'inProgress' | 'success' | 'failed',
        ];

        const toastOptions = result.current.MoneyToastOptions[namespace][
          builder
        ](paramsFactory() as never);

        expect(toastOptions.onPress).toBeUndefined();
      },
    );

    it.each([
      ['withdraw.inProgress', () => undefined],
      [
        'withdraw.success',
        () => ({ amountFiat: '$1.00', destination: 'Account 1' }),
      ],
      ['withdraw.failed', () => undefined],
    ])('never sets onPress on %s', (key, paramsFactory) => {
      const { result } = renderHook(() => useMoneyToasts());
      const [, builder] = key.split('.') as [
        'withdraw',
        'inProgress' | 'success' | 'failed',
      ];

      const toastOptions = result.current.MoneyToastOptions.withdraw[builder](
        paramsFactory() as never,
      );

      expect(toastOptions.onPress).toBeUndefined();
    });
  });
});
