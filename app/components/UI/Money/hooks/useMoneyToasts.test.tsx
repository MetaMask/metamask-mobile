import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { playNotification, NotificationMoment } from '../../../../util/haptics';
import useMoneyToasts from './useMoneyToasts';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ButtonIconProps } from '../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.types';

jest.mock('../../../../util/haptics');

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useAppThemeFromContext: jest.fn(() => actual.mockTheme),
  };
});

describe('useMoneyToasts', () => {
  const mockShowToast = jest.fn();
  const mockCloseToast = jest.fn();
  const mockToastRef = {
    current: {
      showToast: mockShowToast,
      closeToast: mockCloseToast,
    },
  };

  const mockPlayNotification = jest.mocked(playNotification);

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      {children}
    </ToastContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('showToast', () => {
    it('calls toastRef.current.showToast with toast options', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const testConfig = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$10.00',
      });

      result.current.showToast(testConfig);

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Confirmation,
        }),
      );
    });

    it('triggers haptics with correct type', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const testConfig = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$10.00',
      });

      result.current.showToast(testConfig);

      expect(mockPlayNotification).toHaveBeenCalledTimes(1);
      expect(mockPlayNotification).toHaveBeenCalledWith(
        NotificationMoment.Success,
      );
    });

    it('excludes hapticsType from toast options passed to toastRef', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const testConfig = result.current.MoneyToastOptions.deposit.inProgress();

      result.current.showToast(testConfig);

      const callArgs = mockShowToast.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('hapticsType');
    });
  });

  describe('MoneyToastOptions structure', () => {
    it('exposes deposit and withdraw namespaces with all three builders', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

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
    it('inProgress has Loading icon, Warning haptics and persists until dismissed', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.inProgress();

      expect(toast.variant).toBe(ToastVariants.Icon);
      expect(toast.iconName).toBe(IconName.Loading);
      expect(toast.hapticsType).toBe(NotificationMoment.Warning);
      expect(toast.hasNoTimeout).toBe(true);
      expect(toast.startAccessory).toBeDefined();
      expect(toast.labelOptions).toHaveLength(3);
    });

    it('inProgress title is "Converting crypto" when intent is convert (default)', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.inProgress();

      expect(toast.labelOptions?.[0].label).toBe('Converting crypto');
    });

    it('inProgress title is "Adding funds" when intent is addMusd', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.inProgress({
        intent: 'addMusd',
      });

      expect(toast.labelOptions?.[0].label).toBe('Adding funds');
    });

    it('inProgress title/body is "Depositing" / "Card orders may take a few minutes." when intent is card', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.inProgress({
        intent: 'card',
      });

      expect(toast.labelOptions?.[0].label).toBe('Depositing');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe(
        'Card orders may take a few minutes.',
      );
    });

    it('success has Confirmation icon, Success haptics and includes amount in body', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$25.00',
      });

      expect(toast.variant).toBe(ToastVariants.Icon);
      expect(toast.iconName).toBe(IconName.Confirmation);
      expect(toast.iconColor).toBeDefined();
      expect(toast.hapticsType).toBe(NotificationMoment.Success);
      expect(toast.labelOptions).toHaveLength(3);
      expect(toast.labelOptions?.[0].label).toEqual(expect.any(String));
    });

    it('success title is "Conversion complete" when intent is convert (default)', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$25.00',
      });

      expect(toast.labelOptions?.[0].label).toBe('Conversion complete');
    });

    it('success title is "Funds added" when intent is addMusd', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$25.00',
        intent: 'addMusd',
      });

      expect(toast.labelOptions?.[0].label).toBe('Funds added');
    });

    it('success title/body is "Deposit complete" / amount added when intent is card', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$1,000.00',
        intent: 'card',
      });

      expect(toast.labelOptions?.[0].label).toBe('Deposit complete');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe(
        '$1,000.00 added to Money account.',
      );
    });

    it('failed has CircleX icon, Error haptics and a descriptive body', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.failed();

      expect(toast.variant).toBe(ToastVariants.Icon);
      expect(toast.iconName).toBe(IconName.CircleX);
      expect(toast.iconColor).toBeDefined();
      expect(toast.hapticsType).toBe(NotificationMoment.Error);
      expect(toast.labelOptions).toHaveLength(3);
      expect(toast.labelOptions?.[0].label).toEqual(expect.any(String));
    });

    it('failed title/body is "Conversion failed" / "Unable to convert. Try again." for convert (default)', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.failed();

      expect(toast.labelOptions?.[0].label).toBe('Conversion failed');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe('Unable to convert. Try again.');
    });

    it('failed title/body is "Failed to add funds" / "Unable to add funds. Try again." for addMusd', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.failed({
        intent: 'addMusd',
      });

      expect(toast.labelOptions?.[0].label).toBe('Failed to add funds');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe('Unable to add funds. Try again.');
    });

    it('failed title/body is "Deposit failed" / "Unable to add funds. Try again." for card', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.failed({
        intent: 'card',
      });

      expect(toast.labelOptions?.[0].label).toBe('Deposit failed');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe('Unable to add funds. Try again.');
    });
  });

  describe('withdraw toasts', () => {
    it('inProgress mirrors the deposit in-progress configuration', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.withdraw.inProgress();

      expect(toast.variant).toBe(ToastVariants.Icon);
      expect(toast.iconName).toBe(IconName.Loading);
      expect(toast.hapticsType).toBe(NotificationMoment.Warning);
      expect(toast.hasNoTimeout).toBe(true);
    });

    it('inProgress title/body is "Transfer in progress" / "This may take a few minutes."', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.withdraw.inProgress();

      expect(toast.labelOptions?.[0].label).toBe('Transfer in progress');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe('This may take a few minutes.');
    });

    it('success title/body interpolates the destination account name', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.withdraw.success({
        amountFiat: '$50.00',
        destination: 'Account 1',
      });

      expect(toast.iconName).toBe(IconName.Confirmation);
      expect(toast.hapticsType).toBe(NotificationMoment.Success);
      expect(toast.labelOptions?.[0].label).toBe('Transfer complete');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe('$50.00 added to Account 1.');
    });

    it('success body falls back to "Added to {{destination}}." when amount is missing', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.withdraw.success({
        destination: 'My main wallet',
      });

      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe('Added to My main wallet.');
    });

    it('failed title/body is "Transfer failed" / "Unable to transfer funds. Try again."', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.withdraw.failed();

      expect(toast.iconName).toBe(IconName.CircleX);
      expect(toast.hapticsType).toBe(NotificationMoment.Error);
      expect(toast.labelOptions?.[0].label).toBe('Transfer failed');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe(
        'Unable to transfer funds. Try again.',
      );
    });
  });

  describe('send toasts', () => {
    it('inProgress mirrors the in-progress configuration', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.send.inProgress();

      expect(toast.variant).toBe(ToastVariants.Icon);
      expect(toast.iconName).toBe(IconName.Loading);
      expect(toast.hapticsType).toBe(NotificationMoment.Warning);
      expect(toast.hasNoTimeout).toBe(true);
    });

    it('inProgress title/body is "Sending funds" / "This may take a few minutes."', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.send.inProgress();

      expect(toast.labelOptions?.[0].label).toBe('Sending funds');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe('This may take a few minutes.');
    });

    it('success title/body interpolates the amount and destination', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.send.success({
        amountFiat: '$50.00',
        destination: 'Perps',
      });

      expect(toast.iconName).toBe(IconName.Confirmation);
      expect(toast.hapticsType).toBe(NotificationMoment.Success);
      expect(toast.labelOptions?.[0].label).toBe('Funds sent');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe('$50.00 is available in Perps.');
    });

    it('success body falls back to "Available in {{destination}}." when amount is missing', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.send.success({
        destination: 'Predict',
      });

      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe('Available in Predict.');
    });

    it('failed title/body is "Send failed" / "Unable to send funds. Try again."', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.send.failed();

      expect(toast.iconName).toBe(IconName.CircleX);
      expect(toast.hapticsType).toBe(NotificationMoment.Error);
      expect(toast.labelOptions?.[0].label).toBe('Send failed');
      const secondary = toast.labelOptions?.[2].label as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      expect(secondary.props.children).toBe('Unable to send funds. Try again.');
    });
  });

  describe('closeButtonOptions', () => {
    it.each([
      ['deposit.inProgress', () => ({}), 'inProgress'],
      ['deposit.success', () => ({ amountFiat: '$1.00' }), 'success'],
      ['deposit.failed', () => ({}), 'failed'],
      ['withdraw.inProgress', () => ({}), 'inProgress'],
      [
        'withdraw.success',
        () => ({ amountFiat: '$1.00', destination: 'Account 1' }),
        'success',
      ],
      ['withdraw.failed', () => ({}), 'failed'],
      ['send.inProgress', () => ({}), 'inProgress'],
      [
        'send.success',
        () => ({ amountFiat: '$1.00', destination: 'Perps' }),
        'success',
      ],
      ['send.failed', () => ({}), 'failed'],
    ])('exposes a Close button on %s', (key, paramsFactory, _builder) => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });
      const [namespace, builder] = key.split('.') as [
        'deposit' | 'withdraw' | 'send',
        'inProgress' | 'success' | 'failed',
      ];

      const params = paramsFactory() as never;
      const toast =
        result.current.MoneyToastOptions[namespace][builder](params);

      expect(toast.closeButtonOptions).toBeDefined();
      expect((toast.closeButtonOptions as ButtonIconProps)?.iconName).toBe(
        IconName.Close,
      );
    });

    it('calls closeToast when closeButtonOptions.onPress is invoked', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.deposit.inProgress();

      toast.closeButtonOptions?.onPress?.();

      expect(mockCloseToast).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles missing toastRef gracefully on showToast', () => {
      const emptyWrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastContext.Provider value={{ toastRef: { current: null } }}>
          {children}
        </ToastContext.Provider>
      );

      const { result } = renderHook(() => useMoneyToasts(), {
        wrapper: emptyWrapper,
      });

      const toast = result.current.MoneyToastOptions.deposit.success({
        amountFiat: '$1.00',
      });

      expect(() => result.current.showToast(toast)).not.toThrow();
      expect(mockPlayNotification).toHaveBeenCalled();
    });

    it('handles closeToast with null toastRef gracefully', () => {
      const emptyWrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastContext.Provider value={{ toastRef: { current: null } }}>
          {children}
        </ToastContext.Provider>
      );

      const { result } = renderHook(() => useMoneyToasts(), {
        wrapper: emptyWrapper,
      });

      const toast = result.current.MoneyToastOptions.deposit.inProgress();

      expect(() => toast.closeButtonOptions?.onPress?.()).not.toThrow();
    });
  });
});
