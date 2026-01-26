import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import useEarnToasts from './useEarnToasts';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ButtonIconProps } from '../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.types';

jest.mock('expo-haptics');

const mockTheme = {
  colors: {
    success: {
      default: '#success-default',
    },
    error: {
      default: '#error-default',
    },
    icon: {
      default: '#icon-default',
    },
    background: {
      default: '#background-default',
    },
    primary: {
      default: '#primary-default',
    },
  },
};

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: jest.fn(() => mockTheme),
}));

describe('useEarnToasts', () => {
  const mockShowToast = jest.fn();
  const mockCloseToast = jest.fn();
  const mockToastRef = {
    current: {
      showToast: mockShowToast,
      closeToast: mockCloseToast,
    },
  };

  const mockNotificationAsync = jest.mocked(notificationAsync);

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
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const testConfig = {
        ...result.current.EarnToastOptions.mUsdConversion.success,
      };

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
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const testConfig = {
        ...result.current.EarnToastOptions.mUsdConversion.success,
      };

      result.current.showToast(testConfig);

      expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
      expect(mockNotificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Success,
      );
    });

    it('excludes hapticsType from toast options passed to toastRef', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const testConfig =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'ETH',
        });

      result.current.showToast(testConfig);

      const callArgs = mockShowToast.mock.calls[0][0];

      expect(callArgs).not.toHaveProperty('hapticsType');
    });
  });

  describe('EarnToastOptions structure', () => {
    it('includes mUsdConversion with inProgress, success, and failed options', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      expect(result.current.EarnToastOptions.mUsdConversion).toBeDefined();
      expect(
        result.current.EarnToastOptions.mUsdConversion.inProgress,
      ).toBeDefined();
      expect(
        result.current.EarnToastOptions.mUsdConversion.success,
      ).toBeDefined();
      expect(
        result.current.EarnToastOptions.mUsdConversion.failed,
      ).toBeDefined();
    });

    it('configures success toast with correct properties', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const successToast =
        result.current.EarnToastOptions.mUsdConversion.success;

      expect(successToast.variant).toBe(ToastVariants.Icon);
      expect(successToast.iconName).toBe(IconName.Confirmation);
      expect(successToast.iconColor).toBeDefined();
      expect(successToast.hapticsType).toBe(NotificationFeedbackType.Success);
    });

    it('configures inProgress toast with correct properties when called with params', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'ETH',
        });

      expect(inProgressToast.variant).toBe(ToastVariants.Icon);
      expect(inProgressToast.iconName).toBe(IconName.Loading);
      expect(inProgressToast.hapticsType).toBe(
        NotificationFeedbackType.Warning,
      );
      expect(inProgressToast.hasNoTimeout).toBe(true);
    });

    it('configures failed toast with correct properties', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const failedToast = result.current.EarnToastOptions.mUsdConversion.failed;

      expect(failedToast.variant).toBe(ToastVariants.Icon);
      expect(failedToast.iconName).toBe(IconName.CircleX);
      expect(failedToast.iconColor).toBeDefined();
      expect(failedToast.hapticsType).toBe(NotificationFeedbackType.Error);
    });
  });

  describe('spinner for inProgress toast', () => {
    it('includes startAccessory with TokenIconWithSpinner for inProgress toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'ETH',
        });

      expect(inProgressToast.startAccessory).toBeDefined();
    });
  });

  describe('toast labels', () => {
    it('includes labelOptions in inProgress toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'ETH',
        });

      expect(inProgressToast.labelOptions).toBeDefined();
      expect(Array.isArray(inProgressToast.labelOptions)).toBe(true);
      expect(inProgressToast.labelOptions).toHaveLength(1);
    });

    it('includes labelOptions in success toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const successToast =
        result.current.EarnToastOptions.mUsdConversion.success;

      expect(successToast.labelOptions).toBeDefined();
      expect(Array.isArray(successToast.labelOptions)).toBe(true);
      expect(successToast.labelOptions).toHaveLength(1);
    });

    it('includes labelOptions in failed toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const failedToast = result.current.EarnToastOptions.mUsdConversion.failed;

      expect(failedToast.labelOptions).toBeDefined();
      expect(Array.isArray(failedToast.labelOptions)).toBe(true);
      expect(failedToast.labelOptions).toHaveLength(1);
    });
  });

  describe('closeButtonOptions', () => {
    it('includes closeButtonOptions on inProgress toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'ETH',
        });

      expect(inProgressToast.closeButtonOptions).toBeDefined();
      expect(
        (inProgressToast.closeButtonOptions as ButtonIconProps)?.iconName,
      ).toBe(IconName.Close);
      expect(inProgressToast.closeButtonOptions?.onPress).toBeDefined();
    });

    it('includes closeButtonOptions on success toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const successToast =
        result.current.EarnToastOptions.mUsdConversion.success;

      expect(successToast.closeButtonOptions).toBeDefined();
      expect(
        (successToast.closeButtonOptions as ButtonIconProps)?.iconName,
      ).toBe(IconName.Close);
    });

    it('includes closeButtonOptions on failed toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const failedToast = result.current.EarnToastOptions.mUsdConversion.failed;

      expect(failedToast.closeButtonOptions).toBeDefined();
      expect(
        (failedToast.closeButtonOptions as ButtonIconProps)?.iconName,
      ).toBe(IconName.Close);
    });

    it('calls closeToast when closeButtonOptions.onPress is invoked', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const successToast =
        result.current.EarnToastOptions.mUsdConversion.success;

      successToast.closeButtonOptions?.onPress?.();

      expect(mockCloseToast).toHaveBeenCalledTimes(1);
    });
  });

  describe('startAccessory icons', () => {
    it('includes startAccessory with Icon for success toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const successToast =
        result.current.EarnToastOptions.mUsdConversion.success;

      expect(successToast.startAccessory).toBeDefined();
    });

    it('includes startAccessory with Icon for failed toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const failedToast = result.current.EarnToastOptions.mUsdConversion.failed;

      expect(failedToast.startAccessory).toBeDefined();
    });
  });

  describe('inProgress toast parameters', () => {
    it('creates toast without tokenIcon parameter', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'USDC',
        });

      expect(inProgressToast.variant).toBe(ToastVariants.Icon);
      expect(inProgressToast.startAccessory).toBeDefined();
    });

    it('creates toast without estimatedTimeSeconds parameter', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'DAI',
        });

      expect(inProgressToast.variant).toBe(ToastVariants.Icon);
      expect(inProgressToast.hasNoTimeout).toBe(true);
    });

    it('creates toast with only required tokenSymbol parameter', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'WETH',
        });

      expect(inProgressToast.variant).toBe(ToastVariants.Icon);
      expect(inProgressToast.iconName).toBe(IconName.Loading);
    });
  });

  describe('theme colors', () => {
    it('sets iconColor on success toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const successToast =
        result.current.EarnToastOptions.mUsdConversion.success;

      expect(successToast.iconColor).toBeDefined();
      expect(typeof successToast.iconColor).toBe('string');
    });

    it('sets iconColor on failed toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const failedToast = result.current.EarnToastOptions.mUsdConversion.failed;

      expect(failedToast.iconColor).toBeDefined();
      expect(typeof failedToast.iconColor).toBe('string');
    });
  });

  describe('haptics types', () => {
    it('triggers warning haptics for inProgress toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'ETH',
        });

      result.current.showToast(inProgressToast);

      expect(mockNotificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Warning,
      );
    });

    it('triggers error haptics for failed toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const failedToast = result.current.EarnToastOptions.mUsdConversion.failed;

      result.current.showToast(failedToast);

      expect(mockNotificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Error,
      );
    });
  });

  describe('edge cases', () => {
    it('handles missing toastRef gracefully', () => {
      const emptyWrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastContext.Provider value={{ toastRef: { current: null } }}>
          {children}
        </ToastContext.Provider>
      );

      const { result } = renderHook(() => useEarnToasts(), {
        wrapper: emptyWrapper,
      });

      const testConfig = {
        ...result.current.EarnToastOptions.mUsdConversion.success,
      };

      expect(() => result.current.showToast(testConfig)).not.toThrow();

      expect(mockNotificationAsync).toHaveBeenCalled();
    });

    it('handles closeToast with null toastRef gracefully', () => {
      const emptyWrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastContext.Provider value={{ toastRef: { current: null } }}>
          {children}
        </ToastContext.Provider>
      );

      const { result } = renderHook(() => useEarnToasts(), {
        wrapper: emptyWrapper,
      });

      const successToast =
        result.current.EarnToastOptions.mUsdConversion.success;

      expect(() => successToast.closeButtonOptions?.onPress?.()).not.toThrow();
    });
  });
});
