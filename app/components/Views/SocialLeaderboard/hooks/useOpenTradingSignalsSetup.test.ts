import { renderHook } from '@testing-library/react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useOpenTradingSignalsSetup } from './useOpenTradingSignalsSetup';
import { useNotificationPreferences } from '../NotificationPreferences/hooks';
import { playErrorNotification } from '../../../../util/haptics';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockOnOpenBottomSheet = jest.fn();
let focusEffectCleanup: (() => void) | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../NotificationPreferences/hooks');

jest.mock('../../../../util/haptics', () => ({
  playErrorNotification: jest.fn(() => Promise.resolve()),
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
  const sheetRef = {
    current: {
      onOpenBottomSheet: mockOnOpenBottomSheet,
      onCloseBottomSheet: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    focusEffectCleanup = undefined;
    mockUseFocusEffect.mockImplementation((callback) => {
      const cleanup = callback();
      focusEffectCleanup = typeof cleanup === 'function' ? cleanup : undefined;
    });
    mockUseNotificationPreferences.mockReturnValue(buildPreferences());
  });

  it('opens the setup sheet when both trading-signal channels are disabled', () => {
    const { result } = renderHook(() => useOpenTradingSignalsSetup(sheetRef));

    const handled = result.current.openSetupIfNeeded();

    expect(handled).toBe(true);
    expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('fires an error haptic when the setup sheet is intercepted', () => {
    const { result } = renderHook(() => useOpenTradingSignalsSetup(sheetRef));

    result.current.openSetupIfNeeded(jest.fn());

    expect(mockPlayErrorNotification).toHaveBeenCalledTimes(1);
  });

  it('navigates to notification settings when preferences do not exist', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const { result } = renderHook(() => useOpenTradingSignalsSetup(sheetRef));

    const handled = result.current.openSetupIfNeeded();

    expect(handled).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
    });
    expect(mockOnOpenBottomSheet).not.toHaveBeenCalled();
  });

  it('stores the pending action when navigating to notification settings', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const pendingAction = jest.fn();
    const { result, rerender } = renderHook(() =>
      useOpenTradingSignalsSetup(sheetRef),
    );

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
    const { result } = renderHook(() => useOpenTradingSignalsSetup(sheetRef));

    result.current.openSetupIfNeeded(pendingAction);
    runFocusEffectCleanup();
    runFocusEffect();

    expect(pendingAction).not.toHaveBeenCalled();
  });

  it('opens the setup sheet when returning from settings with channels disabled', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const pendingAction = jest.fn();
    const { result, rerender } = renderHook(() =>
      useOpenTradingSignalsSetup(sheetRef),
    );

    result.current.openSetupIfNeeded(pendingAction);
    runFocusEffectCleanup();

    mockUseNotificationPreferences.mockReturnValue(buildPreferences());
    rerender({});
    runFocusEffect();

    expect(pendingAction).not.toHaveBeenCalled();
    expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockPlayErrorNotification).toHaveBeenCalledTimes(1);
  });

  it('does not fire a haptic on the navigate-to-settings branch', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const { result } = renderHook(() => useOpenTradingSignalsSetup(sheetRef));

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

    const { result } = renderHook(() => useOpenTradingSignalsSetup(sheetRef));

    const handled = result.current.openSetupIfNeeded(jest.fn());

    expect(handled).toBe(false);
    expect(mockOnOpenBottomSheet).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockPlayErrorNotification).not.toHaveBeenCalled();
  });

  it('returns false while preferences are loading', () => {
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ isLoading: true }),
    );

    const { result } = renderHook(() => useOpenTradingSignalsSetup(sheetRef));

    const handled = result.current.openSetupIfNeeded(jest.fn());

    expect(handled).toBe(false);
    expect(mockOnOpenBottomSheet).not.toHaveBeenCalled();
    expect(mockPlayErrorNotification).not.toHaveBeenCalled();
  });

  it('does not resume the deferred action on a background cache update while unfocused', () => {
    mockUseFocusEffect.mockImplementation(() => undefined);
    mockUseNotificationPreferences.mockReturnValue(
      buildPreferences({ hasNotificationPreferences: false }),
    );

    const pendingAction = jest.fn();
    const { result, rerender } = renderHook(() =>
      useOpenTradingSignalsSetup(sheetRef),
    );

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
    expect(mockOnOpenBottomSheet).not.toHaveBeenCalled();
  });

  it('drops the pending action when the sheet is dismissed without enabling', () => {
    const pendingAction = jest.fn();
    const { result } = renderHook(() => useOpenTradingSignalsSetup(sheetRef));

    result.current.openSetupIfNeeded(pendingAction);
    result.current.onSetupDismiss();

    expect(pendingAction).not.toHaveBeenCalled();
  });

  it('forwards the pending action when a channel is enabled before close', () => {
    const pendingAction = jest.fn();
    const { result, rerender } = renderHook(() =>
      useOpenTradingSignalsSetup(sheetRef),
    );

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

    result.current.onSetupDismiss();

    expect(pendingAction).toHaveBeenCalledTimes(1);
  });

  it('runs the pending action only once across repeated dismisses', () => {
    const pendingAction = jest.fn();
    const { result, rerender } = renderHook(() =>
      useOpenTradingSignalsSetup(sheetRef),
    );

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

    result.current.onSetupDismiss();
    result.current.onSetupDismiss();

    expect(pendingAction).toHaveBeenCalledTimes(1);
  });
});
