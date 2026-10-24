import { renderHook, act } from '@testing-library/react-hooks';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { playNotification, NotificationMoment } from '../../../../util/haptics';
import useRewardsToast, { type RewardsToastOptions } from './useRewardsToast';

jest.mock('../../../../util/haptics');

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'rewards.notifications_nudge.title') return "Don't miss out";
    if (key === 'rewards.notifications_nudge.description') {
      return 'Enable notifications to stay informed on campaigns';
    }
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

jest.mock('../../../../images/rewards/notification.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'rewards-notification-svg' }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

const mockToast = jest.mocked(toast);

describe('useRewardsToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showToast', () => {
    it('calls toast excluding hapticsType and triggers haptic feedback', () => {
      const { result } = renderHook(() => useRewardsToast());
      const testConfig: RewardsToastOptions = {
        ...result.current.RewardsToastOptions.success('Test'),
      };

      act(() => {
        result.current.showToast(testConfig);
      });

      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ToastSeverity.Success,
          title: 'Test',
        }),
      );
      expect(mockToast.mock.calls[0][0]).not.toHaveProperty('hapticsType');
      expect(playNotification).toHaveBeenCalledWith(NotificationMoment.Success);
    });

    it('strips hapticsType from payload for enableNotificationsNudge', () => {
      const { result } = renderHook(() => useRewardsToast());
      const nudgeConfig =
        result.current.RewardsToastOptions.enableNotificationsNudge({
          label: 'Turn on',
          onPress: jest.fn(),
        });

      act(() => {
        result.current.showToast(nudgeConfig);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.not.objectContaining({ hapticsType: expect.anything() }),
      );
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          hasNoTimeout: true,
          actionButtonLabel: 'Turn on',
        }),
      );
      expect(playNotification).toHaveBeenCalledWith(NotificationMoment.Warning);
    });
  });

  describe('RewardsToastOptions', () => {
    it('configures success toast with Success severity', () => {
      const { result } = renderHook(() => useRewardsToast());

      const config = result.current.RewardsToastOptions.success(
        'Test Title',
        'Test Subtitle',
      );

      expect(config.severity).toBe(ToastSeverity.Success);
      expect(config.hapticsType).toBe(NotificationMoment.Success);
      expect(config.hasNoTimeout).toBe(false);
      expect(config.title).toBe('Test Title');
      expect(config.description).toBe('Test Subtitle');
    });

    it('configures error toast with Danger severity', () => {
      const { result } = renderHook(() => useRewardsToast());

      const config = result.current.RewardsToastOptions.error(
        'Error Title',
        'Error Subtitle',
      );

      expect(config.severity).toBe(ToastSeverity.Danger);
      expect(config.hapticsType).toBe(NotificationMoment.Error);
      expect(config.hasNoTimeout).toBe(false);
      expect(config.title).toBe('Error Title');
      expect(config.description).toBe('Error Subtitle');
    });

    it('configures warning toast as persistent Warning severity', () => {
      const { result } = renderHook(() => useRewardsToast());

      const config = result.current.RewardsToastOptions.warning(
        'Request received',
        'In about 7 days, your progress will be fully erased.',
      );

      expect(config.severity).toBe(ToastSeverity.Warning);
      expect(config.hapticsType).toBe(NotificationMoment.Warning);
      expect(config.hasNoTimeout).toBe(true);
      expect(config.title).toBe('Request received');
      expect(config.description).toBe(
        'In about 7 days, your progress will be fully erased.',
      );
    });

    it('configures loading toast with a spinner and no timeout', () => {
      const { result } = renderHook(() => useRewardsToast());

      const config = result.current.RewardsToastOptions.loading(
        'Loading...',
        'Please wait',
      );

      expect(config.hapticsType).toBe(NotificationMoment.Warning);
      expect(config.hasNoTimeout).toBe(true);
      expect(config.startAccessory).toBeDefined();
      expect(config.title).toBe('Loading...');
      expect(config.description).toBe('Please wait');
    });

    it('configures entriesClosed toast with a lock accessory', () => {
      const { result } = renderHook(() => useRewardsToast());

      const config = result.current.RewardsToastOptions.entriesClosed(
        'Entries closed',
        'You missed the opt-in window.',
      );

      expect(config.hapticsType).toBe(NotificationMoment.Warning);
      expect(config.hasNoTimeout).toBe(false);
      expect(config.startAccessory).toBeDefined();
      expect(config.title).toBe('Entries closed');
      expect(config.description).toBe('You missed the opt-in window.');
    });

    it('configures enableNotificationsNudge with action button', () => {
      const { result } = renderHook(() => useRewardsToast());
      const onPress = jest.fn();

      const config =
        result.current.RewardsToastOptions.enableNotificationsNudge({
          label: 'Turn on',
          onPress,
        });

      expect(config.hasNoTimeout).toBe(true);
      expect(config.hapticsType).toBe(NotificationMoment.Warning);
      expect(config.title).toBe("Don't miss out");
      expect(config.description).toBe(
        'Enable notifications to stay informed on campaigns',
      );
      expect(config.actionButtonLabel).toBe('Turn on');
      expect(config.actionButtonOnPress).toBe(onPress);
      expect(config.startAccessory).toBeDefined();
      const { getByTestId } = render(config.startAccessory as ReactElement);
      expect(getByTestId('rewards-notification-svg')).toBeDefined();
    });

    it('configures outcomeWinner toast with CTA and close handlers', () => {
      const { result } = renderHook(() => useRewardsToast());
      const onCta = jest.fn();
      const onClose = jest.fn();

      const config = result.current.RewardsToastOptions.outcomeWinner({
        title: 'Winner title',
        description: 'Winner body',
        ctaLabel: 'Next',
        onCtaPress: onCta,
        onClosePress: onClose,
      });

      expect(config.hasNoTimeout).toBe(true);
      expect(config.hapticsType).toBe(NotificationMoment.Success);
      expect(config.title).toBe('Winner title');
      expect(config.description).toBe('Winner body');
      expect(config.actionButtonLabel).toBe('Next');
      expect(config.startAccessory).toBeDefined();
      config.actionButtonOnPress?.({} as never);
      config.onClose?.();
      expect(onCta).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('configures outcomeNonWinner toast with Success severity', () => {
      const { result } = renderHook(() => useRewardsToast());
      const onCta = jest.fn();
      const onClose = jest.fn();

      const config = result.current.RewardsToastOptions.outcomeNonWinner({
        title: 'Thanks title',
        description: 'Thanks body',
        ctaLabel: 'Done',
        onCtaPress: onCta,
        onClosePress: onClose,
      });

      expect(config.severity).toBe(ToastSeverity.Success);
      expect(config.hasNoTimeout).toBe(true);
      expect(config.hapticsType).toBe(NotificationMoment.Warning);
      expect(config.title).toBe('Thanks title');
      expect(config.description).toBe('Thanks body');
      expect(config.actionButtonLabel).toBe('Done');
      config.actionButtonOnPress?.({} as never);
      config.onClose?.();
      expect(onCta).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('omits description when subtitle is not provided', () => {
      const { result } = renderHook(() => useRewardsToast());

      const success = result.current.RewardsToastOptions.success('Title');
      const error = result.current.RewardsToastOptions.error('Error');

      expect(success.description).toBeUndefined();
      expect(error.description).toBeUndefined();
    });
  });
});
