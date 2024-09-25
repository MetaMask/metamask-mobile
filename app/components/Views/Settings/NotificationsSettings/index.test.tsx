import React, { useCallback }  from 'react';
import { renderHook, act } from '@testing-library/react-hooks';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { backgroundState } from '../../../../util/test/initial-root-state';
import NotificationsSettings from '.';

import Routes from '../../../../constants/navigation/Routes';
import { Props } from './NotificationsSettings.types';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

// Mock store.getState
let mockGetState: jest.Mock;
jest.mock('../../../../store', () => {
  mockGetState = jest.fn();
  mockGetState.mockImplementation(() => ({
    notifications: {},
  }));

  return {
    store: {
      getState: mockGetState,
      dispatch: jest.fn(),
    },
  };
});

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  notificationsSettings: {
    isEnabled: true,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../../../util/notifications/services/NotificationService', () => ({
  getAllPermissions: jest.fn(),
}));

const mockDisableNotifications = jest.fn();
const mockEnableNotifications = jest.fn();
const mockSetUiNotificationStatus = jest.fn();
const mockTrackEvent = jest.fn();

const mockNavigation = {
  navigate: jest.fn(),
} as unknown as NavigationProp<ParamListBase>;

const setOptions = jest.fn();

describe('toggleNotificationsEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = (basicFunctionalityEnabled: boolean, isMetamaskNotificationsEnabled: boolean, isProfileSyncingEnabled: boolean) => renderHook(() =>
      useCallback(async () => {
        if (!basicFunctionalityEnabled) {
          mockNavigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.SHEET.BASIC_FUNCTIONALITY,
            params: {
              caller: Routes.SETTINGS.NOTIFICATIONS,
            },
          });
        } else if (isMetamaskNotificationsEnabled) {
          mockDisableNotifications();
          mockSetUiNotificationStatus(false);
        } else {
          const { permission } = await NotificationsService.getAllPermissions(false);
          if (permission !== 'authorized') {
            return;
          }

          mockEnableNotifications();
          mockSetUiNotificationStatus(true);
        }
        mockTrackEvent(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED, {
          settings_type: 'notifications',
          old_value: isMetamaskNotificationsEnabled,
          new_value: !isMetamaskNotificationsEnabled,
          was_profile_syncing_on: isMetamaskNotificationsEnabled ? true : isProfileSyncingEnabled,
        });
      }, [])
    );

  it('navigates to basic functionality screen if basic functionality is disabled', async () => {
    const { result } = setup(false, false, false);

    await act(async () => {
      await result.current();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
      params: {
        caller: Routes.SETTINGS.NOTIFICATIONS,
      },
    });
  });

  it('switches notifications off if notifications previously enabled', async () => {
    const { result } = setup(true, true, false);

    await act(async () => {
      await result.current();
    });

    expect(mockDisableNotifications).toHaveBeenCalled();
    expect(mockSetUiNotificationStatus).toHaveBeenCalledWith(false);
  });

  it('switches notifications ON if notifications previously disabled and permission is authorized', async () => {
    (NotificationsService.getAllPermissions as jest.Mock).mockResolvedValue({ permission: 'authorized' });

    const { result } = setup(true, false, false);

    await act(async () => {
      await result.current();
    });

    expect(mockEnableNotifications).toHaveBeenCalled();
    expect(mockSetUiNotificationStatus).toHaveBeenCalledWith(true);
  });

  it('switches notifications off if device permission is not authorized', async () => {
    (NotificationsService.getAllPermissions as jest.Mock).mockResolvedValue({ permission: 'denied' });

    const { result } = setup(true, false, false);

    await act(async () => {
      await result.current();
    });

    expect(mockEnableNotifications).not.toHaveBeenCalled();
    expect(mockSetUiNotificationStatus).not.toHaveBeenCalled();
  });

  it('tracks MetaMetrics event when notifications settings are updated', async () => {
    (NotificationsService.getAllPermissions as jest.Mock).mockResolvedValue({ permission: 'authorized' });

    const { result } = setup(true, false, true);

    await act(async () => {
      await result.current();
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED, {
      settings_type: 'notifications',
      old_value: false,
      new_value: true,
      was_profile_syncing_on: true,
    });
  });
});

describe('NotificationsSettings', () => {
  it('renders correctly', () => {
    mockGetState.mockImplementation(() => ({
      notifications: {},
    }));
    const { toJSON } = renderWithProvider(
      <NotificationsSettings
        navigation={
          {
            setOptions,
          } as unknown as Props['navigation']
        }
        route={{} as unknown as Props['route']}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('toggles notifications and handle permission correctly', async () => {
    const isMetamaskNotificationsEnabled = true;
    const basicFunctionalityEnabled = true;
    const isProfileSyncingEnabled = true;

    const toggleNotificationsEnabledImpl = jest.fn(() => Promise.resolve({
      isMetamaskNotificationsEnabled,
      basicFunctionalityEnabled,
      isProfileSyncingEnabled,
    }));

    await toggleNotificationsEnabledImpl();

    expect(NotificationsService.getAllPermissions).toHaveBeenCalledTimes(1);
    expect(NotificationsService.getAllPermissions).toHaveBeenCalledWith(false);
  });
});
