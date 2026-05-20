import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { playNotification, NotificationMoment } from '../../../../util/haptics';
import useMoneyToasts from './useMoneyToasts';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ButtonIconProps } from '../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.types';

jest.mock('../../../../util/haptics');

const mockTheme = {
  colors: {
    success: { default: '#success-default' },
    error: { default: '#error-default' },
    icon: { default: '#icon-default' },
    background: { default: '#background-default' },
    primary: { default: '#primary-default' },
  },
};

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: jest.fn(() => mockTheme),
}));

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

    it('success includes both amount and destination in body', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.withdraw.success({
        amountFiat: '$50.00',
        destination: 'Between accounts',
      });

      expect(toast.iconName).toBe(IconName.Confirmation);
      expect(toast.hapticsType).toBe(NotificationMoment.Success);
      expect(toast.labelOptions).toHaveLength(3);
    });

    it('failed surfaces an error toast with the withdraw-specific body', () => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });

      const toast = result.current.MoneyToastOptions.withdraw.failed();

      expect(toast.iconName).toBe(IconName.CircleX);
      expect(toast.hapticsType).toBe(NotificationMoment.Error);
      expect(toast.labelOptions).toHaveLength(3);
      expect(toast.labelOptions?.[0].label).toEqual(expect.any(String));
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
        () => ({ amountFiat: '$1.00', destination: 'Between accounts' }),
        'success',
      ],
      ['withdraw.failed', () => ({}), 'failed'],
    ])('exposes a Close button on %s', (key, paramsFactory, _builder) => {
      const { result } = renderHook(() => useMoneyToasts(), { wrapper });
      const [namespace, builder] = key.split('.') as [
        'deposit' | 'withdraw',
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
