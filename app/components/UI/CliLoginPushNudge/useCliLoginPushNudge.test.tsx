// eslint-disable-next-line react-native/split-platform-components
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { useCliLoginPushNudge } from './useCliLoginPushNudge';
import {
  emitCliLoginPushNudge,
  __resetCliLoginPushNudgeListenersForTests,
} from '../../../core/AgenticCli/cliLoginPushNudgeSignal';

const mockEnableNotifications = jest.fn();
const mockIsPushPermissionPromptable = jest.fn();
const mockIsPushPermissionGranted = jest.fn();
const mockOpenSystemSettings = jest.fn();
const mockIsNotificationsFeatureEnabled = jest.fn();

jest.mock('../../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: () => mockIsNotificationsFeatureEnabled(),
}));

jest.mock('../../../util/notifications/hooks/useNotifications', () => ({
  useEnableNotifications: () => ({
    enableNotifications: mockEnableNotifications,
  }),
}));

jest.mock('../../../util/notifications/services/NotificationService', () => ({
  __esModule: true,
  default: {
    openSystemSettings: () => mockOpenSystemSettings(),
  },
  isPushPermissionPromptable: () => mockIsPushPermissionPromptable(),
  isPushPermissionGranted: () => mockIsPushPermissionGranted(),
}));

jest.mock('../../../core/SDKConnectV2/services/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn() },
}));

describe('useCliLoginPushNudge', () => {
  let appStateChangeHandler: ((state: string) => void) | undefined;
  let removeMocks: jest.Mock[];

  const renderNudge = () => renderHook(() => useCliLoginPushNudge());

  const emit = () => {
    act(() => {
      emitCliLoginPushNudge();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    __resetCliLoginPushNudgeListenersForTests();
    appStateChangeHandler = undefined;
    removeMocks = [];
    mockIsNotificationsFeatureEnabled.mockReturnValue(true);
    mockEnableNotifications.mockResolvedValue(undefined);
    mockIsPushPermissionPromptable.mockResolvedValue(true);
    mockIsPushPermissionGranted.mockResolvedValue(false);
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
    Platform.OS = 'ios';
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _event: string,
      handler: (state: string) => void,
    ) => {
      appStateChangeHandler = handler;
      const remove = jest.fn();
      removeMocks.push(remove);
      return { remove };
    }) as unknown as typeof AppState.addEventListener);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is hidden initially', () => {
    const { result } = renderNudge();

    expect(result.current.isVisible).toBe(false);
  });

  it('becomes visible when the nudge signal is emitted', () => {
    const { result } = renderNudge();

    emit();

    expect(result.current.isVisible).toBe(true);
  });

  it('stays hidden when the notifications feature is disabled', () => {
    mockIsNotificationsFeatureEnabled.mockReturnValue(false);
    const { result } = renderNudge();

    emit();

    expect(result.current.isVisible).toBe(false);
  });

  it('enables notifications when push is already granted', async () => {
    mockIsPushPermissionGranted.mockResolvedValue(true);
    const { result } = renderNudge();
    emit();

    await act(async () => {
      await result.current.onYes();
    });

    expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemSettings).not.toHaveBeenCalled();
    expect(result.current.isVisible).toBe(false);
  });

  it('enables via the OS dialog when push is still promptable on iOS', async () => {
    mockIsPushPermissionPromptable.mockResolvedValue(true);
    const { result } = renderNudge();
    emit();

    await act(async () => {
      await result.current.onYes();
    });

    expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemSettings).not.toHaveBeenCalled();
    expect(result.current.isVisible).toBe(false);
  });

  it('opens device settings when iOS can no longer show its dialog', async () => {
    mockIsPushPermissionPromptable.mockResolvedValue(false);
    const { result } = renderNudge();
    emit();

    await act(async () => {
      await result.current.onYes();
    });

    expect(mockEnableNotifications).not.toHaveBeenCalled();
    expect(mockOpenSystemSettings).toHaveBeenCalledTimes(1);
    expect(result.current.isVisible).toBe(false);
  });

  it('enables on return from settings when permission becomes granted', async () => {
    mockIsPushPermissionPromptable.mockResolvedValue(false);
    const { result } = renderNudge();
    emit();

    await act(async () => {
      await result.current.onYes();
    });

    mockIsPushPermissionGranted.mockResolvedValue(true);
    await act(async () => {
      appStateChangeHandler?.('active');
    });

    expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
  });

  it('does not enable on foreground return when permission is still not granted', async () => {
    mockIsPushPermissionPromptable.mockResolvedValue(false);
    mockIsPushPermissionGranted.mockResolvedValue(false);
    const { result } = renderNudge();
    emit();

    await act(async () => {
      await result.current.onYes();
    });

    mockEnableNotifications.mockClear();
    await act(async () => {
      appStateChangeHandler?.('active');
    });

    expect(mockEnableNotifications).not.toHaveBeenCalled();
  });

  it('hides on "Not now" without enabling', () => {
    const { result } = renderNudge();
    emit();

    act(() => {
      result.current.onNotNow();
    });

    expect(result.current.isVisible).toBe(false);
    expect(mockEnableNotifications).not.toHaveBeenCalled();
  });

  it('ignores button-driven close but hides on genuine dismissal', () => {
    const { result } = renderNudge();
    emit();

    act(() => {
      result.current.onClose(true);
    });
    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.onClose(false);
    });
    expect(result.current.isVisible).toBe(false);
  });

  it('cancels a pending settings-return retry when a new nudge is emitted', async () => {
    mockIsPushPermissionPromptable.mockResolvedValue(false);
    const { result } = renderNudge();
    emit();

    await act(async () => {
      await result.current.onYes();
    });

    expect(removeMocks).toHaveLength(1);

    emit();

    expect(removeMocks[0]).toHaveBeenCalled();
    expect(result.current.isVisible).toBe(true);
  });

  describe('android 13+', () => {
    beforeEach(() => {
      Platform.OS = 'android';
      jest.spyOn(Platform, 'Version', 'get').mockReturnValue(33);
    });

    it('opens settings when the OS permanently denied the permission', async () => {
      jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
      const { result } = renderNudge();
      emit();

      await act(async () => {
        await result.current.onYes();
      });

      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      expect(mockEnableNotifications).not.toHaveBeenCalled();
      expect(mockOpenSystemSettings).toHaveBeenCalledTimes(1);
    });

    it('opens settings when DENIED is returned without showing the OS dialog', async () => {
      const dateNow = jest.spyOn(Date, 'now');
      dateNow.mockReturnValueOnce(0).mockReturnValueOnce(50);
      jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
      const { result } = renderNudge();
      emit();

      await act(async () => {
        await result.current.onYes();
      });

      expect(mockEnableNotifications).not.toHaveBeenCalled();
      expect(mockOpenSystemSettings).toHaveBeenCalledTimes(1);
      dateNow.mockRestore();
    });

    it('closes without settings when the user dismisses the OS dialog', async () => {
      const dateNow = jest.spyOn(Date, 'now');
      dateNow.mockReturnValueOnce(0).mockReturnValueOnce(1500);
      jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
      const { result } = renderNudge();
      emit();

      await act(async () => {
        await result.current.onYes();
      });

      expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
      expect(mockEnableNotifications).not.toHaveBeenCalled();
      expect(mockOpenSystemSettings).not.toHaveBeenCalled();
      dateNow.mockRestore();
    });

    it('enables notifications when the OS grants push permission', async () => {
      jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
      const { result } = renderNudge();
      emit();

      await act(async () => {
        await result.current.onYes();
      });

      expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
      expect(mockOpenSystemSettings).not.toHaveBeenCalled();
    });
  });

  describe('android < 13', () => {
    beforeEach(() => {
      Platform.OS = 'android';
      jest.spyOn(Platform, 'Version', 'get').mockReturnValue(31);
    });

    it('opens settings without a runtime dialog when push is not granted', async () => {
      const { result } = renderNudge();
      emit();

      await act(async () => {
        await result.current.onYes();
      });

      expect(PermissionsAndroid.request).not.toHaveBeenCalled();
      expect(mockEnableNotifications).not.toHaveBeenCalled();
      expect(mockOpenSystemSettings).toHaveBeenCalledTimes(1);
    });
  });
});
