import { renderHook, act } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import useRewardsToast, { RewardsToastOptions } from './useRewardsToast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';

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
    it('calls toastRef showToast and triggers haptic feedback', () => {
      const { result } = renderHook(() => useRewardsToast());

      const testConfig: RewardsToastOptions = {
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [{ label: 'Test', isBold: true }],
        hasNoTimeout: false,
      };

      act(() => {
        result.current.showToast(testConfig);
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
        iconColor: '#4459ff',
        backgroundColor: '#4459ff1a',
        hapticsType: NotificationFeedbackType.Success,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Test Title', isBold: true },
      ]);
      expect(config.closeButtonOptions).toMatchObject({
        variant: ButtonVariants.Primary,
        endIconName: IconName.CircleX,
        label: 'Dismiss',
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
        iconColor: '#4459ff',
        backgroundColor: '#4459ff1a',
        hapticsType: NotificationFeedbackType.Success,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Test Title', isBold: true },
        { label: '\n', isBold: false },
        { label: 'Test Subtitle', isBold: false },
      ]);
      expect(config.closeButtonOptions).toMatchObject({
        variant: ButtonVariants.Primary,
        endIconName: IconName.CircleX,
        label: 'Dismiss',
      });
    });

    it('returns error configuration with title only', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.error('Error Title');

      expect(config).toMatchObject({
        variant: ToastVariants.Icon,
        iconName: IconName.Error,
        iconColor: '#3c4d9d0f',
        backgroundColor: '#ca3542',
        hapticsType: NotificationFeedbackType.Error,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Error Title', isBold: true },
      ]);
      expect(config.closeButtonOptions).toMatchObject({
        variant: ButtonVariants.Primary,
        endIconName: IconName.CircleX,
        label: 'Dismiss',
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
        iconName: IconName.Error,
        iconColor: '#3c4d9d0f',
        backgroundColor: '#ca3542',
        hapticsType: NotificationFeedbackType.Error,
        hasNoTimeout: false,
      });
      expect(config.labelOptions).toEqual([
        { label: 'Error Title', isBold: true },
        { label: '\n', isBold: false },
        { label: 'Error Subtitle', isBold: false },
      ]);
      expect(config.closeButtonOptions).toMatchObject({
        variant: ButtonVariants.Primary,
        endIconName: IconName.CircleX,
        label: 'Dismiss',
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

  describe('getRewardsToastLabels function', () => {
    it('formats labels correctly with title only', () => {
      const { result } = renderHook(() => useRewardsToast());
      const config = result.current.RewardsToastOptions.success('Test Title');

      expect(config.labelOptions).toHaveLength(1);
      expect(config.labelOptions[0]).toEqual({
        label: 'Test Title',
        isBold: true,
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
        isBold: true,
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
        isBold: true,
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
        isBold: true,
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
