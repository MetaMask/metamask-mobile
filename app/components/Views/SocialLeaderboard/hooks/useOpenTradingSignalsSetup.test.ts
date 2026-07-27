import { renderHook } from '@testing-library/react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useOpenTradingSignalsSetup } from './useOpenTradingSignalsSetup';
import { useNotificationPreferences } from '../NotificationPreferences/hooks';
import { playErrorNotification } from '../../../../util/haptics';
import Routes from '../../../../constants/navigation/Routes';
import { createTradingSignalsSetupNavigationDetails } from '../components/TradingSignalsSetupBottomSheet';

const mockNavigate = jest.fn();
let focusEffectCleanup: (() => void) | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../NotificationPreferences/hooks');

jest.mock('../../../../util/haptics', () => ({
  playErrorNotification: jest.fn(() => Promise.resolve()),
}));

jest.mock('../components/TradingSignalsSetupBottomSheet', () => ({
  createTradingSignalsSetupNavigationDetails: jest.fn((params) => [
    'TradingSignalsSetupBottomSheet',
    params,
  ]),
}));

const mockUseNotificationPreferences =
  useNotificationPreferences as jest.MockedFunction<
    typeof useNotificationPreferences
  >;
const mockPlayErrorNotification = playErrorNotification as jest.MockedFunction<
  typeof playErrorNotification
>;
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;
const mockCreateSetupNavigationDetails =
  createTradingSignalsSetupNavigationDetails as jest.MockedFunction<
    typeof createTradingSignalsSetupNavigationDetails
  >;

const SETUP_ROUTE = 'TradingSignalsSetupBottomSheet';

const runFocusEffect = () => {
  const focusCallback = mockUseFocusEffect.mock.calls.at(-1)?.[0];
  focusCallback?.();
};

const runFocusEffectCleanup = () => {
  focusEffectCleanup?.();
};

const buildPreferences = (
  overrides: Partial<ReturnType<typeof useNotificationPreferences>> = {},
): ReturnType<typeof useNotificationPreferences> => ({
  preferences: {
    pushNotificationsEnabled: false,
    inAppNotificationsEnabled: false,
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
});

describe('useOpenTradingSignalsSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    focusEffectCleanup = undefined;
    mockUseFocusEffect.mockImplementation((callback) => {
      const cleanup = callback();
      focusEffectCleanup = typeof cleanup === 'function' ? cleanup : undefined;
    });
    mockUseNotificationPreferences.mockReturnValue(buildPreferences());
  });

  it('navigates to the setup sheet when both trading-signal channels are disabled', () => {
    const pendingAction = jest.fn();
    const { result } = renderHook(() => useOpenTradingSignalsSetup());

    const handled = result.current.openSetupIfNeeded(pendingAction);

    expect(handled).toBe(true);
    expect(mockCreateSetupNavigationDetails).toHaveBeenCalledWith({
      onSetupComplete: pendingAction,
    });
    expect(mockNavigate).toHaveBeenCalledWith(SETUP_ROUTE, {
      onSetupComplete: pendingAction,
    });
  });

  it('fires an error haptic when the setup sheet is intercepted', () => {
    const { result } = renderHook(() => useOpenTradingSignalsSetup());

    result.current.openSetupIfNeeded(jest.fn());

    expect(mockPlayErrorNotification).toHaveBeenCalledTimes(1);
  });

  it('navigates to notification settings when preferences do not exist', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const { result } = renderHook(() => useOpenTradingSignalsSetup());

    const handled = result.current.openSetupIfNeeded();

    expect(handled).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
    });
    expect(mockCreateSetupNavigationDetails).not.toHaveBeenCalled();
  });

  it('forwards the pending action after returning from settings with channels enabled', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const pendingAction = jest.fn();
    const { result, rerender } = renderHook(() => useOpenTradingSignalsSetup());

    result.current.openSetupIfNeeded(pendingAction);
    runFocusEffectCleanup();

    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({
        preferences: {
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: false,
          txAmountLimit: 100,
          mutedTraderProfileIds: [],
        },
      }),
    );
    rerender({});
    runFocusEffect();

    expect(pendingAction).toHaveBeenCalledTimes(1);
  });

  it('drops the pending action when returning from settings without preferences', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const pendingAction = jest.fn();
    const { result } = renderHook(() => useOpenTradingSignalsSetup());

    result.current.openSetupIfNeeded(pendingAction);
    runFocusEffectCleanup();
    runFocusEffect();

    expect(pendingAction).not.toHaveBeenCalled();
  });

  it('navigates to the setup sheet when returning from settings with channels disabled', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const pendingAction = jest.fn();
    const { result, rerender } = renderHook(() => useOpenTradingSignalsSetup());

    result.current.openSetupIfNeeded(pendingAction);
    runFocusEffectCleanup();

    mockUseNotificationPreferences.mockReturnValue(buildPreferences());
    rerender({});
    runFocusEffect();

    expect(pendingAction).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenLastCalledWith(SETUP_ROUTE, {
      onSetupComplete: pendingAction,
    });
    expect(mockPlayErrorNotification).toHaveBeenCalledTimes(1);
  });

  it('does not fire a haptic on the navigate-to-settings branch', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const { result } = renderHook(() => useOpenTradingSignalsSetup());

    result.current.openSetupIfNeeded(jest.fn());

    expect(mockPlayErrorNotification).not.toHaveBeenCalled();
  });

  it('returns false without a haptic when a channel is already enabled', () => {
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

    const { result } = renderHook(() => useOpenTradingSignalsSetup());

    const handled = result.current.openSetupIfNeeded(jest.fn());

    expect(handled).toBe(false);
    expect(mockCreateSetupNavigationDetails).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockPlayErrorNotification).not.toHaveBeenCalled();
  });

  it('returns false while preferences are loading', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ isLoading: true }),
    );

    const { result } = renderHook(() => useOpenTradingSignalsSetup());

    const handled = result.current.openSetupIfNeeded(jest.fn());

    expect(handled).toBe(false);
    expect(mockCreateSetupNavigationDetails).not.toHaveBeenCalled();
    expect(mockPlayErrorNotification).not.toHaveBeenCalled();
  });

  it('does not resume the deferred action on a background cache update while unfocused', () => {
    mockUseFocusEffect.mockImplementation(() => undefined);
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const pendingAction = jest.fn();
    const { result, rerender } = renderHook(() => useOpenTradingSignalsSetup());

    result.current.openSetupIfNeeded(pendingAction);

    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({
        preferences: {
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: false,
          txAmountLimit: 100,
          mutedTraderProfileIds: [],
        },
      }),
    );
    rerender({});

    expect(pendingAction).not.toHaveBeenCalled();
    expect(mockCreateSetupNavigationDetails).not.toHaveBeenCalled();
  });
});
