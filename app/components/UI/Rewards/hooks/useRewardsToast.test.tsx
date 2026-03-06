import { renderHook, act } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import useRewardsToast, { RewardsToastOptions } from './useRewardsToast';
import {
  ToastVariants,
  ButtonIconVariant,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';

// Mock dependencies
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
  useCallback: jest.fn((fn) => fn),
  useMemo: jest.fn((fn) => fn()),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'rewards.toast_dismiss') return 'Dismiss';
    return key;
  }),
}));

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: () => ({
    colors: {
      primary: {
        default: '#4459ff',
        muted: '#4459ff1a',
      },
      background: {
        muted: '#3c4d9d0f',
      },
      success: {
        default: '#457a39',
      },
      error: {
        default: '#ca3542',
      },
    },
  }),
}));

describe('useRewardsToast', () => {
  let mockShowToast: jest.Mock;
  let mockCloseToast: jest.Mock;
  let mockToastRef: {
    current: { showToast: jest.Mock; closeToast: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockShowToast = jest.fn();
    mockCloseToast = jest.fn();
    mockToastRef = {
      current: {
        showToast: mockShowToast,
        closeToast: mockCloseToast,
      },
    };

    (useContext as jest.Mock).mockReturnValue({ toastRef: mockToastRef });
  });

  describe('showToast function', () => {
    it('calls toastRef showToast and triggers haptic feedback', async () => {
      const { result } = renderHook(() => useRewardsToast());

      const testConfig: RewardsToastOptions = {
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [{ label: 'Test', isBold: true }],
        hasNoTimeout: false,
      };

      await act(async () => {
        result.current.showToast(testConfig);
        // Wait for any pending promises to settle
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockShowToast).toHaveBeenCalledWith(testConfig);
      expect(notificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Success,
      );
    });
  });

  describe('RewardsToastOptions configurations', () => {
    it('returns success configuration with title only', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('Test Title');

      expect(config).toMatchObject({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: '#457a39',
        backgroundColor: 'transparent',
        hapticsType: NotificationFeedbackType.Success,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Test Title', isBold: false },
      ]);
      expect(config.closeButtonOptions).toMatchObject({
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
      });
    });

    it('returns success configuration with title and subtitle', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success(
        'Test Title',
        'Test Subtitle',
      );

      expect(config).toMatchObject({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: '#457a39',
        backgroundColor: 'transparent',
        hapticsType: NotificationFeedbackType.Success,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Test Title', isBold: false },
        { label: '\n', isBold: false },
        { label: 'Test Subtitle', isBold: false },
      ]);
      expect(config.closeButtonOptions).toMatchObject({
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
      });
    });

    it('returns error configuration with title only', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.error('Error Title');

      expect(config).toMatchObject({
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        iconColor: '#ca3542',
        backgroundColor: 'transparent',
        hapticsType: NotificationFeedbackType.Error,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Error Title', isBold: false },
      ]);
      expect(config.closeButtonOptions).toMatchObject({
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
      });
    });

    it('returns error configuration with title and subtitle', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.error(
        'Error Title',
        'Error Subtitle',
      );

      expect(config).toMatchObject({
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        iconColor: '#ca3542',
        backgroundColor: 'transparent',
        hapticsType: NotificationFeedbackType.Error,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Error Title', isBold: false },
        { label: '\n', isBold: false },
        { label: 'Error Subtitle', isBold: false },
      ]);
      expect(config.closeButtonOptions).toMatchObject({
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
      });
    });

    it('calls closeToast when close button is pressed', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('Test Title');

      // Call the close button's onPress function
      config.closeButtonOptions?.onPress?.();

      expect(mockCloseToast).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases and error handling', () => {
    it('handles null toastRef gracefully in showToast', async () => {
      (useContext as jest.Mock).mockReturnValue({ toastRef: null });
      const { result } = renderHook(() => useRewardsToast());

      const testConfig: RewardsToastOptions = {
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [{ label: 'Test', isBold: true }],
        hasNoTimeout: false,
      };

      // Should not throw error when toastRef is null
      expect(() => {
        act(() => {
          result.current.showToast(testConfig);
        });
      }).not.toThrow();

      // Wait for any pending promises to settle
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Haptic feedback should still be called
      expect(notificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Success,
      );
    });

    it('handles undefined toastRef.current gracefully in showToast', async () => {
      (useContext as jest.Mock).mockReturnValue({
        toastRef: { current: null },
      });
      const { result } = renderHook(() => useRewardsToast());

      const testConfig: RewardsToastOptions = {
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [{ label: 'Test', isBold: true }],
        hasNoTimeout: false,
      };

      // Should not throw error when toastRef.current is null
      expect(() => {
        act(() => {
          result.current.showToast(testConfig);
        });
      }).not.toThrow();

      // Wait for any pending promises to settle
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Haptic feedback should still be called
      expect(notificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Success,
      );
    });

    it('handles null toastRef gracefully in close button', () => {
      (useContext as jest.Mock).mockReturnValue({ toastRef: null });
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('Test Title');

      // Should not throw error when toastRef is null
      expect(() => {
        config.closeButtonOptions?.onPress?.();
      }).not.toThrow();
    });

    it('handles empty string title', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('');

      expect(config.labelOptions).toEqual([{ label: '', isBold: false }]);
    });

    it('handles only whitespace title', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('   ');

      expect(config.labelOptions).toEqual([{ label: '   ', isBold: false }]);
    });
  });

  describe('memoization and dependency changes', () => {
    it('recreates RewardsToastOptions when toastRef changes', () => {
      const mockToastRef1 = {
        current: { showToast: jest.fn(), closeToast: jest.fn() },
      };
      const mockToastRef2 = {
        current: { showToast: jest.fn(), closeToast: jest.fn() },
      };

      (useContext as jest.Mock).mockReturnValue({ toastRef: mockToastRef1 });
      const { result, rerender } = renderHook(() => useRewardsToast());

      // Change toastRef
      (useContext as jest.Mock).mockReturnValue({ toastRef: mockToastRef2 });
      rerender();

      const newConfig = result.current.RewardsToastOptions.success('Test');

      // Call close button onPress to verify it uses new toastRef
      newConfig.closeButtonOptions?.onPress?.();
      expect(mockToastRef2.current.closeToast).toHaveBeenCalled();
      expect(mockToastRef1.current.closeToast).not.toHaveBeenCalled();
    });
  });

  describe('default options merging', () => {
    it('applies default options to success configuration', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('Test Title');

      // Default options should be applied
      expect(config.hasNoTimeout).toBe(false);
    });

    it('applies default options to error configuration', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.error('Error Title');

      // Default options should be applied
      expect(config.hasNoTimeout).toBe(false);
    });
  });

  describe('getRewardsToastLabels function', () => {
    it('formats labels correctly with title only', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('Test Title');

      expect(config.labelOptions).toHaveLength(1);
      expect(config.labelOptions[0]).toEqual({
        label: 'Test Title',
        isBold: false,
      });
    });

    it('formats labels correctly with title and subtitle', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success(
        'Test Title',
        'Test Subtitle',
      );

      expect(config.labelOptions).toHaveLength(3);
      expect(config.labelOptions[0]).toEqual({
        label: 'Test Title',
        isBold: false,
      });
      expect(config.labelOptions[1]).toEqual({
        label: '\n',
        isBold: false,
      });
      expect(config.labelOptions[2]).toEqual({
        label: 'Test Subtitle',
        isBold: false,
      });
    });

    it('formats error labels correctly with title only', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.error('Error Title');

      expect(config.labelOptions).toHaveLength(1);
      expect(config.labelOptions[0]).toEqual({
        label: 'Error Title',
        isBold: false,
      });
    });

    it('formats error labels correctly with title and subtitle', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.error(
        'Error Title',
        'Error Subtitle',
      );

      expect(config.labelOptions).toHaveLength(3);
      expect(config.labelOptions[0]).toEqual({
        label: 'Error Title',
        isBold: false,
      });
      expect(config.labelOptions[1]).toEqual({
        label: '\n',
        isBold: false,
      });
      expect(config.labelOptions[2]).toEqual({
        label: 'Error Subtitle',
        isBold: false,
      });
    });
  });
});
