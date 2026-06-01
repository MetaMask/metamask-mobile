import '../../../../tests/component-view/mocks';
import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderScreenWithRoutes } from '../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  buildNotificationsState,
  MOCK_NOTIFICATIONS,
} from '../../../../tests/component-view/presets/notifications';
import {
  MOCK_FEATURE_ANNOUNCEMENT_NOTIFICATIONS,
  MOCK_ON_CHAIN_NOTIFICATIONS,
} from '../../../components/UI/Notification/__mocks__/mock_notifications';
import Routes from '../../../constants/navigation/Routes';
import { NotificationMenuViewSelectorsIDs } from './NotificationMenuView.testIds';
import { NotificationsViewSelectorsIDs } from './NotificationsView.testIds';
import NotificationsView from './';

/**
 * Component-view coverage for smoke `enable-notifications-after-onboarding`.
 *
 * Smoke spec: tests/smoke/notifications/enable-notifications-after-onboarding.spec.ts
 *
 * Notifications are seeded into Redux via `buildNotificationsState` (controllers
 * + remote feature flag), mirroring what the smoke E2E gets via
 * `mockNotificationServices` mockttp responses — no nock needed at the view
 * layer. `IS_TEST=true` (set at config-load time in `jest.config.view.js`)
 * flips `isNotificationsFeatureEnabled` on without mocking the config module.
 */

const NOTIFICATIONS_DETAILS_PROBE_TEST_ID = 'notifications-details-probe';
const NOTIFICATIONS_DETAILS_PROBE_ID_TEST_ID = 'notifications-details-probe-id';
const NOTIFICATIONS_DETAILS_BACK_TEST_ID =
  'notifications-details-probe-back-button';

/**
 * Lightweight `NotificationsDetails` stand-in. Avoids needing the real
 * `NotificationComponentState` machinery (block-explorer footers, asset rows…)
 * unrelated to this flow. Mirrors the back-navigation contract that
 * `NotificationDetailsView.tapOnBackButton()` exercises in the smoke spec.
 */
function NotificationsDetailsProbe() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as { notification?: { id?: string } } | undefined;
  return (
    <View testID={NOTIFICATIONS_DETAILS_PROBE_TEST_ID}>
      <Text>Notification Details</Text>
      <Text testID={NOTIFICATIONS_DETAILS_PROBE_ID_TEST_ID}>
        {params?.notification?.id ?? ''}
      </Text>
      <Text
        testID={NOTIFICATIONS_DETAILS_BACK_TEST_ID}
        onPress={() => navigation.goBack()}
      >
        Back
      </Text>
    </View>
  );
}

function renderNotificationsScreen(
  notifications: typeof MOCK_NOTIFICATIONS = MOCK_NOTIFICATIONS,
) {
  return renderScreenWithRoutes(
    NotificationsView as unknown as React.ComponentType,
    { name: 'NotificationsView' },
    [
      {
        name: Routes.NOTIFICATIONS.DETAILS,
        Component: NotificationsDetailsProbe,
      },
    ],
    { state: buildNotificationsState({ notifications }) },
  );
}

describeForPlatforms('Notifications view (list + details flow)', () => {
  /**
   * The smoke spec inspects the rendered list of notifications. In jest,
   * `FlatList` never receives layout metrics so it only renders the first row
   * — instead of fighting virtualization we assert on the FlatList `data`
   * prop, which is the same source the device-rendered list reads from.
   */
  it('exposes the full seeded notifications list to the FlatList data source', () => {
    const result = renderNotificationsScreen();
    const flatList = result.UNSAFE_getByType(FlatList);

    expect(
      result.getByTestId(NotificationsViewSelectorsIDs.NOTIFICATIONS_CONTAINER),
    ).toBeOnTheScreen();

    const data = (flatList.props as { data?: typeof MOCK_NOTIFICATIONS }).data;
    expect(data).toHaveLength(MOCK_NOTIFICATIONS.length);

    const seededIds = new Set(MOCK_NOTIFICATIONS.map((n) => n.id));
    data?.forEach((n) => {
      expect(seededIds.has(n.id)).toBe(true);
    });
  });

  /**
   * Seed only the feature announcement so it's the first (and only) row in
   * the FlatList's initial render window — proves the same tap → details →
   * back path the smoke spec asserts on, without depending on virtualization.
   */
  it('opens details for a feature announcement and returns on back', async () => {
    const featureAnnouncement = MOCK_FEATURE_ANNOUNCEMENT_NOTIFICATIONS[0];
    const result = renderNotificationsScreen([featureAnnouncement]);

    fireEvent.press(
      await result.findByTestId(
        NotificationMenuViewSelectorsIDs.ITEM(featureAnnouncement.id),
      ),
    );

    await waitFor(() => {
      expect(
        result.getByTestId(NOTIFICATIONS_DETAILS_PROBE_TEST_ID),
      ).toBeOnTheScreen();
    });
    expect(
      result.getByTestId(NOTIFICATIONS_DETAILS_PROBE_ID_TEST_ID),
    ).toHaveTextContent(featureAnnouncement.id);

    fireEvent.press(result.getByTestId(NOTIFICATIONS_DETAILS_BACK_TEST_ID));

    await waitFor(() => {
      expect(
        result.getByTestId(
          NotificationsViewSelectorsIDs.NOTIFICATIONS_CONTAINER,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('opens details for a wallet notification and returns on back', async () => {
    const walletNotification = MOCK_ON_CHAIN_NOTIFICATIONS[0];
    const result = renderNotificationsScreen([walletNotification]);

    fireEvent.press(
      await result.findByTestId(
        NotificationMenuViewSelectorsIDs.ITEM(walletNotification.id),
      ),
    );

    await waitFor(() => {
      expect(
        result.getByTestId(NOTIFICATIONS_DETAILS_PROBE_TEST_ID),
      ).toBeOnTheScreen();
    });
    expect(
      result.getByTestId(NOTIFICATIONS_DETAILS_PROBE_ID_TEST_ID),
    ).toHaveTextContent(walletNotification.id);

    fireEvent.press(result.getByTestId(NOTIFICATIONS_DETAILS_BACK_TEST_ID));

    await waitFor(() => {
      expect(
        result.getByTestId(
          NotificationsViewSelectorsIDs.NOTIFICATIONS_CONTAINER,
        ),
      ).toBeOnTheScreen();
    });
  });
});
