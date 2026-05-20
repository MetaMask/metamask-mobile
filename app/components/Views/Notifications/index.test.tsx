import React from 'react';
import { StyleSheet } from 'react-native';
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
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
// eslint-disable-next-line import-x/no-namespace
import * as UseNotificationsModule from '../../../util/notifications/hooks/useNotifications';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { NotificationsViewSelectorsIDs } from './NotificationsView.testIds';
import { NotificationMenuViewSelectorsIDs } from './NotificationMenuView.testIds';

const navigationMock = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn().mockReturnValue(true),
} as unknown as NavigationProp<ParamListBase>;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn().mockReturnValue({}),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

const mockMetrics = {
  trackEvent: jest.fn(),
  createEventBuilder: jest.fn().mockReturnValue({ build: jest.fn() }),
} as unknown as ReturnType<typeof useAnalytics>;
jest.mocked(useAnalytics).mockReturnValue(mockMetrics);

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

const mockNotificationsDisabledState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NotificationServicesController: {
        isNotificationServicesEnabled: false,
        metamaskNotificationsList: [],
      },
    },
  },
};

describe('NotificationsView - header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrange = () => {
    const renderResult = renderWithProvider(
      <NotificationsView navigation={navigationMock} />,
      { state: mockInitialState },
    );
    return renderResult;
  };

  it('finds header title', async () => {
    const { getByTestId } = arrange();

    expect(
      getByTestId(NotificationMenuViewSelectorsIDs.TITLE).props.children,
    ).toBe(strings('app_settings.notifications_title'));
  });

  it('finds close button and invokes navigation when pressed', async () => {
    const { getByTestId } = arrange();

    await act(() =>
      fireEvent.press(
        getByTestId(NotificationMenuViewSelectorsIDs.CLOSE_BUTTON),
      ),
    );
    expect(navigationMock.goBack).toHaveBeenCalled();
  });

  it('navigates home when close button is pressed without back stack', async () => {
    (navigationMock.canGoBack as jest.Mock).mockReturnValueOnce(false);
    const { getByTestId } = arrange();

    await act(() =>
      fireEvent.press(
        getByTestId(NotificationMenuViewSelectorsIDs.CLOSE_BUTTON),
      ),
    );

    expect(navigationMock.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('finds settings button and invokes navigation when pressed', async () => {
    const { getByTestId } = arrange();

    await act(() =>
      fireEvent.press(getByTestId(NotificationMenuViewSelectorsIDs.COG_WHEEL)),
    );
    expect(navigationMock.navigate).toHaveBeenCalledWith(
      Routes.SETTINGS.NOTIFICATIONS,
    );
  });
});

describe('NotificationsView - content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows empty container when no notifications are available', () => {
    const { getByTestId } = renderWithProvider(
      <NotificationsView navigation={navigationMock} />,
      { state: mockInitialState },
    );
    expect(
      getByTestId(NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER),
    ).toBeOnTheScreen();
  });

  it('shows enable prompt and opens settings when notifications are disabled', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <NotificationsView navigation={navigationMock} />,
      { state: mockNotificationsDisabledState },
    );

    expect(
      getByText(strings('notifications.disabled.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('notifications.disabled.message')),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(NotificationsViewSelectorsIDs.ENABLE_NOTIFICATIONS_BUTTON),
    );

    expect(navigationMock.navigate).toHaveBeenCalledWith(
      Routes.SETTINGS.NOTIFICATIONS,
    );
  });

  it('uses the Empty component spacing for the disabled prompt', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <NotificationsView navigation={navigationMock} />,
      { state: mockNotificationsDisabledState },
    );

    const iconStyle = StyleSheet.flatten(
      getByTestId(NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_ICON).props
        .style,
    );
    const titleStyle = StyleSheet.flatten(
      getByText(strings('notifications.disabled.title')).props.style,
    );
    const messageStyle = StyleSheet.flatten(
      getByText(strings('notifications.disabled.message')).props.style,
    );
    const buttonStyle = StyleSheet.flatten(
      getByTestId(NotificationsViewSelectorsIDs.ENABLE_NOTIFICATIONS_BUTTON)
        .props.style,
    );

    expect(iconStyle.marginBottom).toBe(16);
    expect(titleStyle.marginBottom).toBe(4);
    expect(messageStyle.marginBottom).toBe(16);
    expect(buttonStyle.marginTop).toBeUndefined();
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
