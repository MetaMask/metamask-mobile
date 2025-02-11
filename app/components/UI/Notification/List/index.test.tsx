import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { processNotification } from '@metamask/notification-services-controller/notification-services';
import { createMockNotificationEthSent } from '@metamask/notification-services-controller/notification-services/mocks';
import NotificationsList, {
  NotificationsListItem,
  useNotificationOnClick,
} from './';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import MOCK_NOTIFICATIONS from '../__mocks__/mock_notifications';
import { createNavigationProps } from '../../../../util/testUtils';
import {
  hasNotificationComponents,
  NotificationComponentState,
} from '../../../../util/notifications/notification-states';
// eslint-disable-next-line import/no-namespace
import * as Actions from '../../../../actions/notification/helpers';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

const mockNavigation = createNavigationProps({});

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn(() => ({
    build: jest.fn(),
  })),
}));

jest.mock('../../../../util/notifications/constants', () => ({
  ...jest.requireActual('../../../../util/notifications/constants'),
  isNotificationsFeatureEnabled: () => true,
}));

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    ...jest.requireActual(
      '../../../../util/notifications/services/NotificationService',
    ),
    getBadgeCount: jest.fn(),
    decrementBadgeCount: jest.fn(),
    setBadgeCount: jest.fn(),
  }),
);

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    NOTIFICATION_CLICKED: 'NOTIFICATION_CLICKED',
  },
}));

jest.mock('../NotificationMenuItem', () => ({
  NotificationMenuItem: {
    Root: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Icon: jest.fn(({ isRead }: { isRead: boolean }) => (
      <div>{isRead ? 'Read Icon' : 'Unread Icon'}</div>
    )),
    Content: jest.fn(() => <div>Mocked Content</div>),
  },
}));

function arrangeActions() {
  const mockMarkNotificationAsRead = jest
    .spyOn(Actions, 'markMetamaskNotificationsAsRead')
    .mockResolvedValue(undefined);

  return {
    mockMarkNotificationAsRead,
  };
}

describe('NotificationsList', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsList
        navigation={mockNavigation}
        allNotifications={MOCK_NOTIFICATIONS}
        walletNotifications={[MOCK_NOTIFICATIONS[1]]}
        web3Notifications={[MOCK_NOTIFICATIONS[0]]}
        loading
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders empty state', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsList
        navigation={mockNavigation}
        allNotifications={[]}
        walletNotifications={[]}
        web3Notifications={[]}
        loading={false}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('derives notificationState correctly based on notification type', () => {
    const notification = MOCK_NOTIFICATIONS[2];
    if (!hasNotificationComponents(notification.type)) {
      throw new Error('Test Setup Failure - incorrect mock');
    }

    const notifState = NotificationComponentState[notification.type];
    const mockCreateMenuItem = jest.spyOn(notifState, 'createMenuItem');

    renderWithProvider(
      <NotificationsListItem
        notification={MOCK_NOTIFICATIONS[2]}
        navigation={mockNavigation}
      />,
    );

    expect(mockCreateMenuItem).toHaveBeenCalledWith(MOCK_NOTIFICATIONS[2]);
  });
});

describe('useNotificationOnClick', () => {
  const arrangeMocks = () => {
    const { mockMarkNotificationAsRead } = arrangeActions();
    const mockGetBadgeCount = jest
      .mocked(NotificationsService.getBadgeCount)
      .mockResolvedValue(1);
    const mockDecrementBadgeCount = jest.mocked(
      NotificationsService.decrementBadgeCount,
    );
    const mockSetBadgeConut = jest.mocked(NotificationsService.setBadgeCount);

    return {
      mockMarkNotificationAsRead,
      mockGetBadgeCount,
      mockDecrementBadgeCount,
      mockSetBadgeConut,
      mockTrackEvent,
      mockNavigation: createNavigationProps({}).navigation as jest.MockedObject<
        NavigationProp<ParamListBase>
      >,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('call correct logic, and invoke navigation + events', async () => {
    const mocks = arrangeMocks();
    const hook = renderHook(() =>
      useNotificationOnClick({ navigation: mocks.mockNavigation }),
    );
    const notification = processNotification(createMockNotificationEthSent());

    await act(() => hook.result.current(notification));

    // Assert - Controller Action
    expect(mocks.mockMarkNotificationAsRead).toHaveBeenCalledWith([
      expect.objectContaining({ id: notification.id }),
    ]);

    // Assert - Page Navigation
    expect(mocks.mockNavigation.navigate).toHaveBeenCalled();

    // Assert - Badge Update
    expect(mocks.mockGetBadgeCount).toHaveBeenCalled();
    expect(mocks.mockDecrementBadgeCount).toHaveBeenCalled();

    // Assert - Event Fired
    expect(mocks.mockTrackEvent).toHaveBeenCalled();
  });
});
