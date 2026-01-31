import React from 'react';
import { renderHook, act, fireEvent } from '@testing-library/react-native';
import { processNotification } from '@metamask/notification-services-controller/notification-services';
import {
  createMockNotificationEthSent,
  createMockFeatureAnnouncementRaw,
} from '@metamask/notification-services-controller/notification-services/mocks';

import NotificationsView, {
  useMarkAsReadCallback,
  useNotificationFilters,
} from './';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { RootState } from '../../../reducers';
import { backgroundState } from '../../../util/test/initial-root-state';
import { useMetrics } from '../../../components/hooks/useMetrics';
// eslint-disable-next-line import/no-namespace
import * as UseNotificationsModule from '../../../util/notifications/hooks/useNotifications';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import { NotificationsViewSelectorsIDs } from './NotificationsView.testIds';
import Routes from '../../../constants/navigation/Routes';

const navigationMock = {
  navigate: jest.fn(),
} as unknown as NavigationProp<ParamListBase>;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

const mockMetrics = {
  trackEvent: jest.fn(),
  createEventBuilder: jest.fn().mockReturnValue({ build: jest.fn() }),
} as unknown as ReturnType<typeof useMetrics>;
jest.mocked(useMetrics).mockReturnValue(mockMetrics);

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NotificationServicesController: {
        isNotificationServicesEnabled: true,
        metamaskNotificationsList: [],
      },
    },
  },
};

describe('NotificationsView - navigationOptions', () => {
  it('has navigationOptions with headerShown set to false', () => {
    expect(NotificationsView.navigationOptions).toEqual({ headerShown: false });
  });
});

describe('NotificationsView - header interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to wallet home when back button is pressed', () => {
    const { getAllByTestId } = renderWithProvider(
      <NotificationsView navigation={navigationMock} />,
      { state: mockInitialState },
    );

    const buttons = getAllByTestId('button-icon');
    const backButton = buttons[0];
    fireEvent.press(backButton);

    expect(navigationMock.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('navigates to notifications settings when settings button is pressed', () => {
    const { getAllByTestId } = renderWithProvider(
      <NotificationsView navigation={navigationMock} />,
      { state: mockInitialState },
    );

    const buttons = getAllByTestId('button-icon');
    const settingsButton = buttons[buttons.length - 1];
    fireEvent.press(settingsButton);

    expect(navigationMock.navigate).toHaveBeenCalledWith(
      Routes.SETTINGS.NOTIFICATIONS,
    );
  });
});

describe('NotificationsView - content', () => {
  it('shows empty container when no notifications are available', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationsView navigation={navigationMock} />,
      { state: mockInitialState },
    );
    expect(
      getByTestId(NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER),
    ).toBeOnTheScreen();
  });
});

describe('useMarkAsReadCallback', () => {
  const arrangeMocks = () => {
    const mockMarkNotificationsAsRead = jest.fn();
    jest
      .spyOn(UseNotificationsModule, 'useMarkNotificationAsRead')
      .mockReturnValue({
        loading: false,
        markNotificationAsRead: mockMarkNotificationsAsRead,
      });

    const mockSetBadgeCount = jest.spyOn(NotificationsService, 'setBadgeCount');

    return {
      mockMetrics,
      mockMarkNotificationsAsRead,
      mockSetBadgeCount,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks content as read and fires event', async () => {
    const mocks = arrangeMocks();
    const notifications = [
      processNotification(createMockNotificationEthSent()),
    ];
    const hook = renderHook(() => useMarkAsReadCallback({ notifications }));

    await act(() => hook.result.current.handleMarkAllAsRead());

    // Assert - mark as read action called
    expect(mocks.mockMarkNotificationsAsRead).toHaveBeenCalled();

    // Assert - badge count updated
    expect(mocks.mockSetBadgeCount).toHaveBeenCalled();

    // Assert - event fired
    expect(mocks.mockMetrics.trackEvent).toHaveBeenCalled();
  });
});

describe('useNotificationFilters', () => {
  const createEthNotif = () =>
    processNotification(createMockNotificationEthSent());
  const createAnnonucementNotif = () =>
    processNotification(createMockFeatureAnnouncementRaw());

  const arrangeNotifications = (ids: string[]) => {
    const notifications = ids.map((id) => {
      const notif = createEthNotif();
      notif.id = id;
      notif.createdAt = Date.now().toString();
      return notif;
    });

    return notifications;
  };

  it('deduplicates any notifications', () => {
    const notifications = arrangeNotifications(['1', '1', '1']);
    const hook = renderHook(() => useNotificationFilters({ notifications }));
    expect(hook.result.current.allNotifications).toHaveLength(1);
  });

  it('returns all notifications', () => {
    const notifications = [createEthNotif(), createAnnonucementNotif()];
    const hook = renderHook(() => useNotificationFilters({ notifications }));
    expect(hook.result.current.allNotifications).toHaveLength(2);
  });
});
