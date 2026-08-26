import { renderHook } from '@testing-library/react-native';
import { useTraderMuteActions } from './useTraderMuteActions';
import { useOpenTradingSignalsSetup } from './useOpenTradingSignalsSetup';
import { useNotificationPreferences } from '../NotificationPreferences/hooks';
import { ImpactMoment, playImpact } from '../../../../util/haptics';

jest.mock('../NotificationPreferences/hooks');
jest.mock('./useOpenTradingSignalsSetup');
jest.mock('../../../../util/haptics', () => ({
  ImpactMoment: { FollowToggle: 'FollowToggle' },
  playImpact: jest.fn(),
}));

const mockUseNotificationPreferences =
  useNotificationPreferences as jest.MockedFunction<
    typeof useNotificationPreferences
  >;
const mockUseOpenTradingSignalsSetup =
  useOpenTradingSignalsSetup as jest.MockedFunction<
    typeof useOpenTradingSignalsSetup
  >;

const buildPreferences = (
  overrides: Partial<ReturnType<typeof useNotificationPreferences>> = {},
): ReturnType<typeof useNotificationPreferences> =>
  ({
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
    setInAppNotificationsEnabled: jest.fn(),
    setTxAmountLimit: jest.fn(),
    toggleTraderNotification: jest.fn(),
    isTraderNotificationEnabled: jest.fn(() => true),
    ...overrides,
  }) as ReturnType<typeof useNotificationPreferences>;

/** @param intercepts - What `openSetupIfNeeded` returns (true = setup opened). */
const setGate = (intercepts: boolean) => {
  const openSetupIfNeeded = jest.fn(
    (_pendingAction?: () => void | Promise<void>) => intercepts,
  );
  mockUseOpenTradingSignalsSetup.mockReturnValue({ openSetupIfNeeded });
  return openSetupIfNeeded;
};

describe('useTraderMuteActions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports a trader as muted when their notifications are off', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ isTraderNotificationEnabled: jest.fn(() => false) }),
    );
    setGate(false);

    const { result } = renderHook(() => useTraderMuteActions());

    expect(result.current.isChipMuted('trader-1')).toBe(true);
  });

  it('reports a trader as not muted when their notifications are on', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ isTraderNotificationEnabled: jest.fn(() => true) }),
    );
    setGate(false);

    const { result } = renderHook(() => useTraderMuteActions());

    expect(result.current.isChipMuted('trader-1')).toBe(false);
  });

  it('leaves the chip unmuted when only one trading-signal channel is on', () => {
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
    setGate(false);

    const { result } = renderHook(() => useTraderMuteActions());

    // In-app alone is enough: an audible trader's bell must not read as muted.
    expect(result.current.isChipMuted('trader-1')).toBe(false);
  });

  it('shows the chip as muted when both channels are off globally', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({
        preferences: {
          pushNotificationsEnabled: false,
          inAppNotificationsEnabled: false,
          txAmountLimit: 100,
          mutedTraderProfileIds: [],
        },
        isTraderNotificationEnabled: jest.fn(() => true),
      }),
    );
    setGate(false);

    const { result } = renderHook(() => useTraderMuteActions());

    // The trader itself is not paused, but with both channels off nothing can
    // be heard, so the bell still reads as muted.
    expect(result.current.isChipMuted('trader-1')).toBe(true);
  });

  it('toggles directly and fires a haptic when setup is not needed', () => {
    const toggleTraderNotification = jest.fn();
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ toggleTraderNotification }),
    );
    setGate(false);

    const { result } = renderHook(() => useTraderMuteActions());
    result.current.onMutePress('trader-1');

    expect(playImpact).toHaveBeenCalledWith(ImpactMoment.FollowToggle);
    expect(toggleTraderNotification).toHaveBeenCalledWith('trader-1');
  });

  it('defers an idempotent unmute to setup instead of toggling blind', () => {
    const toggleTraderNotification = jest.fn();
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({
        toggleTraderNotification,
        isTraderNotificationEnabled: jest.fn(() => false),
      }),
    );
    const openSetupIfNeeded = setGate(true);

    const { result } = renderHook(() => useTraderMuteActions());
    result.current.onMutePress('trader-1');

    // Nothing happens inline — the action is handed to the setup sheet.
    expect(toggleTraderNotification).not.toHaveBeenCalled();

    // Running the deferred action unmutes, because the trader was muted.
    openSetupIfNeeded.mock.calls[0][0]?.();
    expect(toggleTraderNotification).toHaveBeenCalledWith('trader-1');
  });

  it('leaves an already-unmuted trader alone when setup completes', () => {
    const toggleTraderNotification = jest.fn();
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({
        toggleTraderNotification,
        isTraderNotificationEnabled: jest.fn(() => true),
      }),
    );
    const openSetupIfNeeded = setGate(true);

    const { result } = renderHook(() => useTraderMuteActions());
    result.current.onMutePress('trader-1');
    openSetupIfNeeded.mock.calls[0][0]?.();

    // Idempotent: completing setup must not mute a trader who was audible.
    expect(toggleTraderNotification).not.toHaveBeenCalled();
  });

  it('hides the chip entirely when the user has no saved preferences', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );
    setGate(false);

    const { result } = renderHook(() => useTraderMuteActions());

    expect(result.current.showMuteChip).toBe(false);
  });
});
