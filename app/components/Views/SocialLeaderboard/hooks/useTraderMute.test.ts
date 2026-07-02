import { renderHook } from '@testing-library/react-native';
import { useTraderMute } from './useTraderMute';
import { useNotificationPreferences } from '../NotificationPreferences/hooks';

jest.mock('../NotificationPreferences/hooks');

const mockUseNotificationPreferences =
  useNotificationPreferences as jest.MockedFunction<
    typeof useNotificationPreferences
  >;

const buildPreferences = (
  overrides: Partial<ReturnType<typeof useNotificationPreferences>> = {},
): ReturnType<typeof useNotificationPreferences> => ({
  preferences: {
    pushNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    txAmountLimit: 100,
    mutedTraderProfileIds: [],
  },
  hasNotificationPreferences: true,
  isLoading: false,
  error: null,
  setPushNotificationsEnabled: jest.fn(),
  setTxAmountLimit: jest.fn(),
  toggleTraderNotification: jest.fn(),
  isTraderNotificationEnabled: jest.fn(() => true),
  ...overrides,
});

describe('useTraderMute', () => {
  it('reports muted when the trader is not receiving notifications', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ isTraderNotificationEnabled: jest.fn(() => false) }),
    );

    const { result } = renderHook(() => useTraderMute('trader-1'));

    expect(result.current.isMuted).toBe(true);
  });

  it('reports not muted when the trader is receiving notifications', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ isTraderNotificationEnabled: jest.fn(() => true) }),
    );

    const { result } = renderHook(() => useTraderMute('trader-1'));

    expect(result.current.isMuted).toBe(false);
  });

  it('marks mute available only when push notifications are enabled', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({
        preferences: {
          pushNotificationsEnabled: false,
          inAppNotificationsEnabled: true,
          txAmountLimit: 100,
          mutedTraderProfileIds: [],
        },
      }),
    );

    const { result } = renderHook(() => useTraderMute('trader-1'));

    expect(result.current.isMuteAvailable).toBe(false);
  });

  it('marks mute unavailable when no notification preferences exist', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const { result } = renderHook(() => useTraderMute('trader-1'));

    expect(result.current.isMuteAvailable).toBe(false);
  });

  it('toggles the underlying trader notification with the trader id', () => {
    const toggleTraderNotification = jest.fn();
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ toggleTraderNotification }),
    );

    const { result } = renderHook(() => useTraderMute('trader-42'));
    result.current.toggleMute();

    expect(toggleTraderNotification).toHaveBeenCalledWith('trader-42');
  });
});
