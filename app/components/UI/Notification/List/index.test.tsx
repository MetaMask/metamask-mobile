import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { NotificationServicesController } from '@metamask/notification-services-controller';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';
import NotificationsList, { NotificationsListItem } from './';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import renderWithProvider, { DeepPartial } from '../../../../util/test/renderWithProvider';
import MOCK_NOTIFICATIONS from '../__mocks__/mock_notifications';
import initialRootState, { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import { createNavigationProps } from '../../../../util/testUtils';
import { hasNotificationModal, hasNotificationComponents, NotificationComponentState } from '../../../../util/notifications/notification-states';
import { useMarkNotificationAsRead } from '../../../../util/notifications/hooks/useNotifications';
import { Notification } from '../../../../util/notifications/types';
// eslint-disable-next-line import/no-namespace
import * as Actions from '../../../../actions/notification/helpers';
import { NotificationState } from '../../../../util/notifications/notification-states/types/NotificationState';
import { TRIGGER_TYPES } from '../../../../util/notifications/constants';
const mockNavigation = createNavigationProps({});

const mockTrackEvent = jest.fn();

jest.mock('../../../../util/notifications/constants', () => ({
  ...jest.requireActual('../../../../util/notifications/constants'),
  isNotificationsFeatureEnabled: () => true,
}));

jest.mock('../../../../util/notifications/services/NotificationService', () => ({
  ...jest.requireActual('../../../../util/notifications/services/NotificationService'),
  getBadgeCount: jest.fn(),
  decrementBadgeCount: jest.fn(),
  setBadgeCount: jest.fn(),
}));

jest.mock('../../../../util/notifications/notification-states', () => ({
  hasNotificationModal: jest.fn(),
  hasNotificationComponents: jest.fn(),
  NotificationComponentState: {},
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
  }),
  MetaMetricsEvents: {
    NOTIFICATION_CLICKED: 'NOTIFICATION_CLICKED',
  },
}));

const navigation = {
  navigate: jest.fn(),
};

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NotificationServicesController: {
        metamaskNotificationsList: [],
      },
    },
  },
};

jest.mock('../NotificationMenuItem', () => ({
  NotificationMenuItem: {
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Icon: jest.fn(({ isRead }: { isRead: boolean }) => <div>{isRead ? 'Read Icon' : 'Unread Icon'}</div>),
    Content: jest.fn(() => <div>Mocked Content</div>),
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: (state: DeepPartial<RootState>) => unknown) => fn(mockInitialState),
}));

function arrangeStore() {
  const store = createMockStore()(initialRootState);

  // Ensure dispatch mocks are handled correctly
  store.dispatch = jest.fn().mockImplementation((action) => {
    if (typeof action === 'function') {
      return action(store.dispatch, store.getState);
    }
    return Promise.resolve();
  });

  return store;
}

function arrangeActions() {
  const mockMarkNotificationAsRead = jest.spyOn(Actions, 'markMetamaskNotificationsAsRead').mockResolvedValue(undefined);

  return {
    mockMarkNotificationAsRead,
  };
}

function arrangeHook() {
  const store = arrangeStore();
  const hook = renderHook(() => useMarkNotificationAsRead(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });

  return hook;
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

  it('marks notification as read and not navigates if modal does not exist', async () => {
    (hasNotificationModal as jest.Mock).mockReturnValue(false);
    (NotificationsService.getBadgeCount as jest.Mock).mockResolvedValue(0);
    const mockActions = arrangeActions();
    const { result } = arrangeHook();
    await act(async () => {
      await result.current.markNotificationAsRead([
        {
          id: MOCK_NOTIFICATIONS[2].id,
          type: MOCK_NOTIFICATIONS[2].type,
          isRead: MOCK_NOTIFICATIONS[2].isRead,
        },
      ]);
    });

    expect(mockActions.mockMarkNotificationAsRead).toHaveBeenCalledWith([
      {
        id: MOCK_NOTIFICATIONS[2].id,
        type: MOCK_NOTIFICATIONS[2].type,
        isRead: MOCK_NOTIFICATIONS[2].isRead,
      },
    ]);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('derives notificationState correctly based on notification type', () => {
    (hasNotificationComponents as unknown as jest.Mock).mockReturnValue(true);
    (NotificationComponentState as Record<TRIGGER_TYPES, NotificationState<Notification>>)[MOCK_NOTIFICATIONS[2].type] = {
      createMenuItem: jest.fn().mockReturnValue({
        title: MOCK_NOTIFICATIONS[2].type,
        description: {
          start: MOCK_NOTIFICATIONS[2].type,
        },
        image: {
          url: MOCK_NOTIFICATIONS[2].type,
          variant: 'circle',
        },
        badgeIcon: MOCK_NOTIFICATIONS[2].type,
        createdAt: MOCK_NOTIFICATIONS[2].createdAt,
        isRead: MOCK_NOTIFICATIONS[2].isRead,
      }),
      guardFn: (n): n is NotificationServicesController.Types.INotification => true,
    };

    renderWithProvider(
      <NotificationsListItem
        notification={MOCK_NOTIFICATIONS[2]}
        navigation={mockNavigation}
      />
    );

    expect((NotificationComponentState as Record<TRIGGER_TYPES, NotificationState<Notification>>)[MOCK_NOTIFICATIONS[2].type].createMenuItem).toHaveBeenCalledWith(MOCK_NOTIFICATIONS[2]);
  });
});

