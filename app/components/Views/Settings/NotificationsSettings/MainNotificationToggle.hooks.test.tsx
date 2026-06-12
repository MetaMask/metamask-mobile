import { act, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useMainNotificationToggle } from './MainNotificationToggle.hooks';
import Routes from '../../../../constants/navigation/Routes';
import { useNotificationsToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';

// Mock dependencies
jest.mock('@react-navigation/native');
jest.mock('../../../../util/notifications/hooks/useSwitchNotifications');

const mockUseNavigation = jest.mocked(useNavigation);
const mockUseNotificationsToggle = jest.mocked(useNotificationsToggle);

describe('useMainNotificationToggle', () => {
  beforeEach(() => jest.clearAllMocks());

  const arrangeState = () => {
    const mockState = {
      settings: {
        basicFunctionalityEnabled: true,
      },
      engine: {
        backgroundState: {
          UserStorageController: {
            isBackupAndSyncEnabled: true,
          },
        },
      },
    };
    return { mockState };
  };

  const arrangeMocks = () => {
    const navigate = jest.fn();
    const switchNotifications = jest.fn();

    mockUseNavigation.mockReturnValue({
      navigate,
    } as never);

    mockUseNotificationsToggle.mockReturnValue({
      data: true,
      loading: false,
      error: null,
      switchNotifications,
    });

    return {
      navigate,
      switchNotifications,
      ...arrangeState(),
    };
  };

  const arrangeTest = (
    overridesMocks?: (m: ReturnType<typeof arrangeMocks>) => void,
  ) => {
    const mocks = arrangeMocks();
    overridesMocks?.(mocks);

    const { result } = renderHookWithProvider(
      () => useMainNotificationToggle(),
      { state: mocks.mockState },
    );

    return {
      mocks,
      result,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the explicit next value when toggling from enabled to disabled', async () => {
    const { mocks, result } = arrangeTest();

    act(() => {
      result.current.onToggle(false);
    });

    await waitFor(() => {
      expect(mocks.switchNotifications).toHaveBeenCalledWith(false);
    });
  });

  it('uses the explicit next value when toggling from disabled to enabled', async () => {
    const { mocks, result } = arrangeTest((m) => {
      mockUseNotificationsToggle.mockReturnValue({
        data: false,
        loading: false,
        error: null,
        switchNotifications: m.switchNotifications,
      });
    });

    act(() => {
      result.current.onToggle(true);
    });

    await waitFor(() => {
      expect(mocks.switchNotifications).toHaveBeenCalledWith(true);
    });
  });

  it('serializes rapid toggle writes and preserves latest intent', async () => {
    let resolveFirstToggle: () => void = () => undefined;
    const firstTogglePromise = new Promise<void>((resolve) => {
      resolveFirstToggle = resolve;
    });
    const { mocks, result } = arrangeTest((m) => {
      m.switchNotifications
        .mockReturnValueOnce(firstTogglePromise)
        .mockResolvedValueOnce(undefined);
    });

    act(() => {
      result.current.onToggle(false);
      result.current.onToggle(true);
    });

    await waitFor(() => {
      expect(mocks.switchNotifications).toHaveBeenCalledTimes(1);
      expect(mocks.switchNotifications).toHaveBeenNthCalledWith(1, false);
    });

    await act(async () => {
      resolveFirstToggle();
      await firstTogglePromise;
    });

    expect(mocks.switchNotifications).toHaveBeenCalledTimes(2);
    expect(mocks.switchNotifications).toHaveBeenNthCalledWith(2, true);
  });

  it('navigate to basic functionality screen when basicFunctionalityEnabled is false', () => {
    const { mocks, result } = arrangeTest((m) => {
      m.mockState.settings.basicFunctionalityEnabled = false;
    });

    act(() => {
      result.current.onToggle(false);
    });

    expect(mocks.navigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
      params: {
        caller: Routes.SETTINGS.NOTIFICATIONS,
      },
    });
    expect(mocks.switchNotifications).not.toHaveBeenCalled();
  });
});
