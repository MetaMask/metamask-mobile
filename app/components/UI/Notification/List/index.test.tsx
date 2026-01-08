import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  TRIGGER_TYPES,
  processNotification,
  type INotification,
} from '@metamask/notification-services-controller/notification-services';
import {
  createMockNotificationERC20Received,
  createMockNotificationERC20Sent,
  createMockNotificationEthReceived,
  createMockNotificationEthSent,
} from '@metamask/notification-services-controller/notification-services/mocks';
import NotificationsList, {
  NotificationsListItem,
  TEST_IDS,
  useNotificationOnClick,
} from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockNotificationsWithMetaData } from '../__mocks__/mock_notifications';
import { createNavigationProps } from '../../../../util/testUtils';
import { NotificationsViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/NotificationsView.selectors';
import { NotificationMenuViewSelectorsIDs } from '../../../../../e2e/selectors/Notifications/NotificationMenuView.selectors';
// eslint-disable-next-line import/no-namespace
import * as UseNotificationsModule from '../../../../util/notifications/hooks/useNotifications';

const mockNavigation = createNavigationProps({});
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn(() => ({
    build: jest.fn(),
  })),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    NOTIFICATION_CLICKED: 'NOTIFICATION_CLICKED',
  },
}));

describe('NotificationsList States', () => {
  const mockNotifSlice = mockNotificationsWithMetaData.slice(0, 1);
  const itemIds = mockNotifSlice
    .map(({ notification }) =>
      NotificationMenuViewSelectorsIDs.ITEM(notification.id),
    )
    .slice(0, 1);
  const statesTests = [
    {
      type: 'loading',
      elemsRendered: [TEST_IDS.loadingContainer],
      elemsNotRendered: [
        NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER,
        ...itemIds,
      ],
    },
    {
      type: 'empty',
      elemsRendered: [NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER],
      elemsNotRendered: [TEST_IDS.loadingContainer, ...itemIds],
    },
    {
      type: 'data',
      elemsRendered: [...itemIds],
      elemsNotRendered: [
        TEST_IDS.loadingContainer,
        NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER,
      ],
    },
  ] as const;

  it.each(statesTests)(
    'renders correct list state - $type',
    ({ type, elemsRendered, elemsNotRendered }) => {
      const getTestState = () => {
        if (type === 'loading') {
          return { allNotifications: [], loading: true };
        }
        if (type === 'empty') {
          return { allNotifications: [], loading: false };
        }
        if (type === 'data') {
          return {
            allNotifications: mockNotifSlice.map((n) => n.notification),
            loading: false,
          };
        }
        throw new Error('TEST FAIL - NO TEST STATE FOUND');
      };

      const { getByTestId, queryByTestId } = renderWithProvider(
        <NotificationsList navigation={mockNavigation} {...getTestState()} />,
      );

      elemsRendered.forEach((id) => {
        expect(getByTestId(id)).toBeOnTheScreen();
      });

      elemsNotRendered.forEach((id) => {
        expect(queryByTestId(id)).not.toBeOnTheScreen();
      });
    },
  );
});

describe('NotificationsListItem', () => {
  it('returns null on invalid notification', () => {
    const { root } = renderWithProvider(
      <NotificationsListItem
        navigation={mockNavigation}
        notification={
          { type: 'Invalid-Notification' } as unknown as INotification
        }
      />,
    );
    expect(root).toBeUndefined();
  });

  it('returns null on unsupported eth_sent and eth_received notifications', () => {
    const invalidNotifications = [
      processNotification(createMockNotificationEthSent()),
      processNotification(createMockNotificationEthReceived()),
    ].map((n) => {
      if (
        n.type === TRIGGER_TYPES.ETH_SENT ||
        n.type === TRIGGER_TYPES.ETH_RECEIVED
      ) {
        n.payload.chain_id = 123; // unsupported chainId
      }

      return n;
    });

    invalidNotifications.forEach((n) => {
      const { root } = renderWithProvider(
        <NotificationsListItem navigation={mockNavigation} notification={n} />,
      );
      expect(root).toBeUndefined();
    });
  });

  it('returns null on unsupported erc20_sent and erc20_received notifications', () => {
    const invalidNotifications = [
      processNotification(createMockNotificationERC20Sent()),
      processNotification(createMockNotificationERC20Received()),
    ].map((n) => {
      if (
        n.type === TRIGGER_TYPES.ERC20_SENT ||
        n.type === TRIGGER_TYPES.ERC20_RECEIVED
      ) {
        n.payload.chain_id = 123; // unsupported chainId
      }

      return n;
    });

    invalidNotifications.forEach((n) => {
      const { root } = renderWithProvider(
        <NotificationsListItem navigation={mockNavigation} notification={n} />,
      );
      expect(root).toBeUndefined();
    });
  });

  it.each(mockNotificationsWithMetaData)(
    'renders notification menu item - $type',
    ({ notification }) => {
      const { getByTestId } = renderWithProvider(
        <NotificationsListItem
          navigation={mockNavigation}
          notification={notification}
        />,
      );

      expect(
        getByTestId(NotificationMenuViewSelectorsIDs.ITEM(notification.id)),
      ).toBeOnTheScreen();
    },
  );
});

describe('useNotificationOnClick', () => {
  const arrangeMocks = () => {
    const mockMarkNotificationAsRead = jest.fn();
    jest
      .spyOn(UseNotificationsModule, 'useMarkNotificationAsRead')
      .mockReturnValue({
        loading: false,
        markNotificationAsRead: mockMarkNotificationAsRead,
      });

    return {
      mockMarkNotificationAsRead,
      mockTrackEvent,
      mockNavigation: createNavigationProps({}).navigation,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(mockNotificationsWithMetaData)(
    'invokes click callback and attempts navigation for notification - $type',
    async ({ notification, hasModal }) => {
      const mocks = arrangeMocks();
      const hook = renderHook(() =>
        useNotificationOnClick({ navigation: mocks.mockNavigation }),
      );
      await act(() => hook.result.current.onNotificationClick(notification));
      expect(mocks.mockMarkNotificationAsRead).toHaveBeenCalled();
      expect(mocks.mockTrackEvent).toHaveBeenCalled();

      if (hasModal) {
        expect(mocks.mockNavigation.navigate).toHaveBeenCalled();
      } else {
        expect(mocks.mockNavigation.navigate).not.toHaveBeenCalled();
      }
    },
  );
});
