import { renderHook } from '@testing-library/react-native';
import { useOpenTradingSignalsSetup } from './useOpenTradingSignalsSetup';
import { useNotificationPreferences } from '../NotificationPreferences/hooks';
import { playErrorNotification } from '../../../../util/haptics';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockOnOpenBottomSheet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
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
