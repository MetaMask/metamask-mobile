import { useNavigation } from '@react-navigation/native';
import { useMainNotificationToggle } from './MainNotificationToggle.hooks';
import Routes from '../../../../constants/navigation/Routes';
import { useNotificationsToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { useMetrics } from '../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { EVENT_NAME } from '../../../../core/Analytics';

// Mock dependencies
jest.mock('@react-navigation/native');
jest.mock('../../../../util/notifications/hooks/useSwitchNotifications');
jest.mock('../../../hooks/useMetrics');

const mockUseNavigation = jest.mocked(useNavigation);
const mockUseNotificationsToggle = jest.mocked(useNotificationsToggle);
const mockUseMetrics = jest.mocked(useMetrics);

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
    const trackEvent = jest.fn();

    mockUseNavigation.mockReturnValue({
      navigate,
    } as never);

    mockUseNotificationsToggle.mockReturnValue({
      data: true,
      loading: false,
      error: null,
      switchNotifications,
    });

    mockUseMetrics.mockReturnValue({
      trackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    } as never);

    return {
      navigate,
      switchNotifications,
      trackEvent,
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

  it('toggles notifications from false to true', () => {
    const { mocks, result } = arrangeTest();

    result.current.onToggle();

    expect(mocks.switchNotifications).toHaveBeenCalledWith(false);
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: EVENT_NAME.NOTIFICATIONS_SETTINGS_UPDATED,
        properties: expect.objectContaining({
          settings_type: 'notifications',
          old_value: true,
          new_value: false,
          was_profile_syncing_on: true,
        }),
      }),
    );
  });

  it('toggles from false to true', () => {
    const { mocks, result } = arrangeTest((m) => {
      mockUseNotificationsToggle.mockReturnValue({
        data: false,
        loading: false,
        error: null,
        switchNotifications: m.switchNotifications,
      });
    });

    result.current.onToggle();

    expect(mocks.switchNotifications).toHaveBeenCalledWith(true);
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: EVENT_NAME.NOTIFICATIONS_SETTINGS_UPDATED,
        properties: expect.objectContaining({
          settings_type: 'notifications',
          old_value: false,
          new_value: true,
          was_profile_syncing_on: true,
        }),
      }),
    );
  });

  it('navigate to basic functionality screen when basicFunctionalityEnabled is false', () => {
    const { mocks, result } = arrangeTest((m) => {
      m.mockState.settings.basicFunctionalityEnabled = false;
    });

    result.current.onToggle();

    expect(mocks.navigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
      params: {
        caller: Routes.SETTINGS.NOTIFICATIONS,
      },
    });
    expect(mocks.switchNotifications).not.toHaveBeenCalled();
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });
});
