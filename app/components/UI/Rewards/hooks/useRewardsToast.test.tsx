import { renderHook, act } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { mockTheme } from '../../../../util/theme';
import useRewardsToast, { RewardsToastOptions } from './useRewardsToast';
import {
  ToastVariants,
  ButtonIconVariant,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';

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

jest.mock('../../../../util/theme', () => {
  const actualTheme = jest.requireActual('../../../../util/theme');
  return {
    ...actualTheme,
    useAppThemeFromContext: () => actualTheme.mockTheme,
  };
});

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
        iconColor: mockTheme.colors.success.default,
        backgroundColor: 'transparent',
        hapticsType: NotificationFeedbackType.Success,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Test Title', isBold: true },
      ]);
      expect(config.descriptionOptions).toBeUndefined();
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
        iconColor: mockTheme.colors.success.default,
        hapticsType: NotificationFeedbackType.Success,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Test Title', isBold: true },
      ]);
      expect(config.descriptionOptions).toEqual({
        description: 'Test Subtitle',
      });
    });

    it('returns error configuration with title only', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.error('Error Title');

      expect(config).toMatchObject({
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        iconColor: mockTheme.colors.error.default,
        backgroundColor: 'transparent',
        hapticsType: NotificationFeedbackType.Error,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Error Title', isBold: true },
      ]);
      expect(config.descriptionOptions).toBeUndefined();
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
        iconColor: mockTheme.colors.error.default,
        hapticsType: NotificationFeedbackType.Error,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Error Title', isBold: true },
      ]);
      expect(config.descriptionOptions).toEqual({
        description: 'Error Subtitle',
      });
    });

    it('returns entriesClosed configuration with title only', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config =
        result.current.RewardsToastOptions.entriesClosed('Entries closed');

      expect(config).toMatchObject({
        variant: ToastVariants.Icon,
        iconName: IconName.Lock,
        iconColor: mockTheme.colors.icon.muted,
        backgroundColor: 'transparent',
        hapticsType: NotificationFeedbackType.Warning,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Entries closed', isBold: true },
      ]);
      expect(config.descriptionOptions).toBeUndefined();
      expect(config.closeButtonOptions).toMatchObject({
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
      });
    });

    it('returns entriesClosed configuration with title and subtitle', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.entriesClosed(
        'Entries closed',
        'You missed the opt-in window',
      );

      expect(config).toMatchObject({
        variant: ToastVariants.Icon,
        iconName: IconName.Lock,
        iconColor: mockTheme.colors.icon.muted,
        hapticsType: NotificationFeedbackType.Warning,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Entries closed', isBold: true },
      ]);
      expect(config.descriptionOptions).toEqual({
        description: 'You missed the opt-in window',
      });
    });

    it('calls closeToast when close button is pressed', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('Test Title');

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

      expect(() => {
        act(() => {
          result.current.showToast(testConfig);
        });
      }).not.toThrow();

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

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

      expect(() => {
        act(() => {
          result.current.showToast(testConfig);
        });
      }).not.toThrow();

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(notificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Success,
      );
    });

    it('handles null toastRef gracefully in close button', () => {
      (useContext as jest.Mock).mockReturnValue({ toastRef: null });
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('Test Title');

      expect(() => {
        config.closeButtonOptions?.onPress?.();
      }).not.toThrow();
    });

    it('handles empty string title', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('');

      expect(config.labelOptions).toEqual([{ label: '', isBold: true }]);
    });

    it('handles only whitespace title', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('   ');

      expect(config.labelOptions).toEqual([{ label: '   ', isBold: true }]);
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

      (useContext as jest.Mock).mockReturnValue({ toastRef: mockToastRef2 });
      rerender();

      const newConfig = result.current.RewardsToastOptions.success('Test');

      newConfig.closeButtonOptions?.onPress?.();
      expect(mockToastRef2.current.closeToast).toHaveBeenCalled();
      expect(mockToastRef1.current.closeToast).not.toHaveBeenCalled();
    });
  });

  describe('default options merging', () => {
    it('applies default options to success configuration', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('Test Title');

      expect(config.hasNoTimeout).toBe(false);
    });

    it('applies default options to error configuration', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.error('Error Title');

      expect(config.hasNoTimeout).toBe(false);
    });

    it('applies default options to entriesClosed configuration', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config =
        result.current.RewardsToastOptions.entriesClosed('Entries closed');

      expect(config.hasNoTimeout).toBe(false);
    });
  });

  describe('label and description formatting', () => {
    it('returns bold label with title only', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('Test Title');

      expect(config.labelOptions).toHaveLength(1);
      expect(config.labelOptions[0]).toEqual({
        label: 'Test Title',
        isBold: true,
      });
    });

    it('returns bold label and descriptionOptions with subtitle', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success(
        'Test Title',
        'Test Subtitle',
      );

      expect(config.labelOptions).toHaveLength(1);
      expect(config.labelOptions[0]).toEqual({
        label: 'Test Title',
        isBold: true,
      });
      expect(config.descriptionOptions).toEqual({
        description: 'Test Subtitle',
      });
    });

    it('returns undefined descriptionOptions when no subtitle for error', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.error('Error Title');

      expect(config.labelOptions).toHaveLength(1);
      expect(config.labelOptions[0]).toEqual({
        label: 'Error Title',
        isBold: true,
      });
      expect(config.descriptionOptions).toBeUndefined();
    });

    it('returns descriptionOptions for error with subtitle', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.error(
        'Error Title',
        'Error Subtitle',
      );

      expect(config.labelOptions).toHaveLength(1);
      expect(config.descriptionOptions).toEqual({
        description: 'Error Subtitle',
      });
    });
  });
});
