import React from 'react';
import { Linking } from 'react-native';
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
  applyNotificationTemplate,
} from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { mockNotificationsWithMetaData } from '../__mocks__/mock_notifications';
import { createNavigationProps } from '../../../../util/testUtils';
import { NotificationsViewSelectorsIDs } from '../../../Views/Notifications/NotificationsView.testIds';
import { NotificationMenuViewSelectorsIDs } from '../../../Views/Notifications/NotificationMenuView.testIds';
// eslint-disable-next-line import-x/no-namespace
import * as UseNotificationsModule from '../../../../util/notifications/hooks/useNotifications';
import SharedDeeplinkManager from '../../../../core/DeeplinkManager/DeeplinkManager';

jest.mock('../../../../core/DeeplinkManager/DeeplinkManager', () => ({
  parse: jest.fn(),
}));

const mockNavigation = createNavigationProps({});
const mockTrackEvent = jest.fn();

jest.mock('../../../hooks/useAnalytics/useAnalytics');

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useAnalytics)
    .mockReturnValue(
      createMockUseAnalyticsHook({ trackEvent: mockTrackEvent }),
    );
});

describe('applyNotificationTemplate', () => {
  // Cast needed: baseItem is a minimal stub, not a full MenuItemState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseItem: any = {
    title: 'Client title',
    description: { start: 'Client description', end: 'Client end' },
    image: { url: 'https://example.com/image.png' },
    badgeIcon: 'badge',
    createdAt: '2024-01-01',
  };

  it('returns item unchanged when template is absent', () => {
    expect(applyNotificationTemplate(baseItem, undefined)).toBe(baseItem);
  });

  it('returns item unchanged when item is undefined', () => {
    expect(
      applyNotificationTemplate(undefined, { title: 'Backend' }),
    ).toBeUndefined();
  });

  it('overrides title when template.title is present', () => {
    const result = applyNotificationTemplate(baseItem, {
      title: 'Backend title',
    });
    expect(result?.title).toBe('Backend title');
  });

  it('falls back to client title when template.title is empty string', () => {
    const result = applyNotificationTemplate(baseItem, { title: '' });
    expect(result?.title).toBe('Client title');
  });

  it('overrides description.start when template.body is present', () => {
    const result = applyNotificationTemplate(baseItem, {
      body: 'Backend body',
    });
    expect(result?.description?.start).toBe('Backend body');
  });

  it('drops description.end when template.body is set (prose full-width override)', () => {
    const result = applyNotificationTemplate(baseItem, {
      body: 'Backend body',
    });
    expect(result?.description?.end).toBeUndefined();
  });

  it('keeps description.end when template.body is empty string', () => {
    const result = applyNotificationTemplate(baseItem, { body: '' });
    expect(result?.description?.end).toBe('Client end');
  });

  it('does not affect description.end when only template.title is set', () => {
    const result = applyNotificationTemplate(baseItem, {
      title: 'Backend title',
    });
    expect(result?.description?.end).toBe('Client end');
  });

  it('falls back to client description when template.body is empty string', () => {
    const result = applyNotificationTemplate(baseItem, { body: '' });
    expect(result?.description?.start).toBe('Client description');
  });

  it('overrides both title and description when both are present', () => {
    const result = applyNotificationTemplate(baseItem, {
      title: 'Backend title',
      body: 'Backend body',
    });
    expect(result?.title).toBe('Backend title');
    expect(result?.description?.start).toBe('Backend body');
  });

  it('preserves non-copy fields (image, badgeIcon, createdAt)', () => {
    const result = applyNotificationTemplate(baseItem, {
      title: 'Backend title',
      body: 'Backend body',
    });
    expect(result?.image).toEqual(baseItem.image);
    expect(result?.badgeIcon).toBe(baseItem.badgeIcon);
    expect(result?.createdAt).toBe(baseItem.createdAt);
  });
});

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
        n.payload = undefined as never; // no valid network metadata
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
        n.payload = undefined as never; // no valid network metadata
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

  it.each(mockNotificationsWithMetaData)(
    'marks as read and tracks analytics for notification - $type',
    async ({ notification }) => {
      const mocks = arrangeMocks();
      const hook = renderHook(() =>
        useNotificationOnClick({ navigation: mocks.mockNavigation }),
      );

      await act(() => hook.result.current.onNotificationPress(notification));

      expect(mocks.mockMarkNotificationAsRead).toHaveBeenCalled();
      expect(mocks.mockTrackEvent).toHaveBeenCalled();
    },
  );

  it.each(mockNotificationsWithMetaData)(
    'navigates to detail modal when no CTA link is provided - $type',
    async ({ notification, hasModal }) => {
      const mocks = arrangeMocks();
      const hook = renderHook(() =>
        useNotificationOnClick({ navigation: mocks.mockNavigation }),
      );

      await act(() => hook.result.current.onNotificationPress(notification));

      if (hasModal) {
        expect(mocks.mockNavigation.navigate).toHaveBeenCalled();
      } else {
        expect(mocks.mockNavigation.navigate).not.toHaveBeenCalled();
      }
    },
  );

  it('opens deeplink via SharedDeeplinkManager when CTA link contains metamask universal link host', async () => {
    const mockParse = jest.mocked(SharedDeeplinkManager.parse);
    const mocks = arrangeMocks();
    const hook = renderHook(() =>
      useNotificationOnClick({ navigation: mocks.mockNavigation }),
    );
    const notification = mockNotificationsWithMetaData[0].notification;
    const ctaLink = 'https://link.metamask.io/some-path';

    await act(() =>
      hook.result.current.onNotificationPress(notification, ctaLink),
    );

    expect(mockParse).toHaveBeenCalledWith(ctaLink, expect.any(Object));
    expect(mocks.mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('opens external URL via Linking when CTA link is not a metamask universal link', async () => {
    const mockOpenURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const mocks = arrangeMocks();
    const hook = renderHook(() =>
      useNotificationOnClick({ navigation: mocks.mockNavigation }),
    );
    const notification = mockNotificationsWithMetaData[0].notification;
    const ctaLink = 'https://example.com/some-path';

    await act(() =>
      hook.result.current.onNotificationPress(notification, ctaLink),
    );

    expect(mockOpenURL).toHaveBeenCalledWith(ctaLink);
    expect(mocks.mockNavigation.navigate).not.toHaveBeenCalled();
  });
});
