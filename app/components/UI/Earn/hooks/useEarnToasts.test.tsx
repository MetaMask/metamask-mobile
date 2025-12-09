import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import useEarnToasts from './useEarnToasts';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';

jest.mock('expo-haptics');
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'earn.musd_conversion.toasts.in_progress') {
      return `Converting to mUSD`;
    }
    if (key === 'earn.musd_conversion.toasts.success') {
      return `Converted to mUSD`;
    }
    if (key === 'earn.musd_conversion.toasts.failed') {
      return `Failed to convert to mUSD`;
    }
    return key;
  }),
}));

const mockTheme = {
  colors: {
    accent01: {
      dark: '#accent01-dark',
      light: '#accent01-light',
    },
    accent03: {
      dark: '#accent03-dark',
      normal: '#accent03-normal',
    },
    accent04: {
      dark: '#accent04-dark',
      normal: '#accent04-normal',
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
          iconName: IconName.CheckBold,
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

      const testConfig = {
        ...result.current.EarnToastOptions.mUsdConversion.inProgress,
      };

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
      expect(successToast.iconName).toBe(IconName.CheckBold);
      expect(successToast.iconColor).toBeDefined();
      expect(successToast.backgroundColor).toBeDefined();
      expect(successToast.hapticsType).toBe(NotificationFeedbackType.Success);
    });

    it('configures inProgress toast with correct properties', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress;

      expect(inProgressToast.variant).toBe(ToastVariants.Icon);
      expect(inProgressToast.iconName).toBe(IconName.Loading);
      expect(inProgressToast.iconColor).toBeDefined();
      expect(inProgressToast.backgroundColor).toBeDefined();
      expect(inProgressToast.hapticsType).toBe(
        NotificationFeedbackType.Warning,
      );
    });

    it('configures failed toast with correct properties', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const failedToast = result.current.EarnToastOptions.mUsdConversion.failed;

      expect(failedToast.variant).toBe(ToastVariants.Icon);
      expect(failedToast.iconName).toBe(IconName.Warning);
      expect(failedToast.iconColor).toBeDefined();
      expect(failedToast.backgroundColor).toBeDefined();
      expect(failedToast.hapticsType).toBe(NotificationFeedbackType.Error);
    });
  });

  describe('spinner for inProgress toast', () => {
    it('includes startAccessory with Spinner for inProgress toast', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress;

      expect(inProgressToast.startAccessory).toBeDefined();
    });
  });

  describe('toast labels', () => {
    it('includes tokenSymbol in inProgress label', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress;

      expect(inProgressToast.labelOptions).toBeDefined();
      expect(Array.isArray(inProgressToast.labelOptions)).toBe(true);
      expect(inProgressToast.labelOptions).toHaveLength(1);
    });

    it('includes tokenSymbol in success label', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const successToast =
        result.current.EarnToastOptions.mUsdConversion.success;

      expect(successToast.labelOptions).toBeDefined();
      expect(Array.isArray(successToast.labelOptions)).toBe(true);
      expect(successToast.labelOptions).toHaveLength(1);
    });

    it('includes tokenSymbol in failed label', () => {
      const { result } = renderHook(() => useEarnToasts(), { wrapper });

      const failedToast = result.current.EarnToastOptions.mUsdConversion.failed;

      expect(failedToast.labelOptions).toBeDefined();
      expect(Array.isArray(failedToast.labelOptions)).toBe(true);
      expect(failedToast.labelOptions).toHaveLength(1);
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
  });
});
