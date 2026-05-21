import '../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import {
  renderComponentViewScreen,
  renderScreenWithRoutes,
} from '../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { buildNotificationsState } from '../../../../../tests/component-view/presets/notifications';
import NotificationsSettings from './';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';

const MOCK_NOTIFICATION_PREFERENCES = {
  walletActivity: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    accounts: [],
  },
  perps: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
  socialAI: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    txAmountLimit: 100,
    mutedTraderProfileIds: [],
  },
  marketing: {
    inAppNotificationsEnabled: false,
    pushNotificationsEnabled: false,
  },
};

/**
 * Component-view coverage for smoke `notification-settings-flow`.
 *
 * Smoke spec: tests/smoke/notifications/notification-settings-flow.spec.ts
 *
 * AUS-backed notification preferences are provided through Engine, matching
 * the component-view boundary for data-service calls.
 */

const GET_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences';

const SECTION_TITLES = {
  walletActivity: 'Wallet Activity',
  perps: 'Trading Activity',
  socialAI: 'Trading Signals',
  marketing: 'Updates and Rewards',
};

const hasFetchedNotificationPreferences = () =>
  (Engine.controllerMessenger.call as jest.Mock).mock.calls.some(
    ([action]) => action === GET_NOTIFICATION_PREFERENCES_ACTION,
  );

function renderSettings(
  stateOverrides?: Parameters<typeof buildNotificationsState>[0],
) {
  return renderComponentViewScreen(
    NotificationsSettings as unknown as React.ComponentType,
    { name: 'NotificationsSettings' },
    { state: buildNotificationsState(stateOverrides) },
    { isFullScreenModal: false },
  );
}

function renderSettingsWithSectionRoute(
  stateOverrides?: Parameters<typeof buildNotificationsState>[0],
) {
  return renderScreenWithRoutes(
    NotificationsSettings as unknown as React.ComponentType,
    { name: 'NotificationsSettings' },
    [{ name: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION }],
    { state: buildNotificationsState(stateOverrides) },
    { isFullScreenModal: false },
  );
}

describeForPlatforms('Notifications settings (toggles + visibility)', () => {
  beforeEach(() => {
    const controllerMessengerCall = Engine.controllerMessenger.call.bind(
      Engine.controllerMessenger,
    ) as (action: string, ...args: unknown[]) => unknown;

    const mockControllerMessengerCall = ((
      action: string,
      ...args: unknown[]
    ) => {
      if (action === GET_NOTIFICATION_PREFERENCES_ACTION) {
        return Promise.resolve(MOCK_NOTIFICATION_PREFERENCES);
      }

      return controllerMessengerCall(action, ...args);
    }) as unknown as typeof Engine.controllerMessenger.call;

    jest
      .spyOn(Engine.controllerMessenger, 'call')
      .mockImplementation(mockControllerMessengerCall);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders notification sections when notifications are enabled', async () => {
    const { getByTestId, getByText, findAllByText, findByText } =
      renderSettings();

    expect(
      getByTestId(NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE),
    ).toBeOnTheScreen();

    expect(await findByText(SECTION_TITLES.walletActivity)).toBeOnTheScreen();
    expect(getByText(SECTION_TITLES.perps)).toBeOnTheScreen();
    expect(getByText(SECTION_TITLES.socialAI)).toBeOnTheScreen();
    expect(getByText(SECTION_TITLES.marketing)).toBeOnTheScreen();
    expect(await findAllByText('Push, In app')).toHaveLength(3);
    expect(getByText('Off')).toBeOnTheScreen();
  });

  it('hides notification sections when main toggle is off', async () => {
    const { getByTestId, queryByText } = renderSettings({
      notificationsEnabled: false,
    });

    expect(
      getByTestId(NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE),
    ).toBeOnTheScreen();

    await waitFor(() => {
      expect(hasFetchedNotificationPreferences()).toBe(true);
      expect(queryByText(SECTION_TITLES.walletActivity)).toBeNull();
    });
    expect(queryByText(SECTION_TITLES.perps)).toBeNull();
    expect(queryByText(SECTION_TITLES.socialAI)).toBeNull();
    expect(queryByText(SECTION_TITLES.marketing)).toBeNull();
  });

  it('invokes the disable controller path when the main toggle is pressed (on -> off)', async () => {
    const disableSpy = jest
      .spyOn(
        Engine.context.NotificationServicesController as unknown as {
          disableNotificationServices: () => Promise<void>;
        },
        'disableNotificationServices',
      )
      .mockResolvedValue(undefined);

    try {
      const { getByTestId } = renderSettings();

      fireEvent(
        getByTestId(NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE),
        'onChange',
        { nativeEvent: { value: false } },
      );

      await waitFor(() => {
        expect(disableSpy).toHaveBeenCalled();
      });
    } finally {
      disableSpy.mockRestore();
    }
  });

  it('navigates to the wallet activity notification section when its row is pressed', async () => {
    const { getByText, findByTestId } = renderSettingsWithSectionRoute();

    fireEvent.press(getByText(SECTION_TITLES.walletActivity));

    expect(
      await findByTestId(
        `route-${Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION}`,
      ),
    ).toBeOnTheScreen();
  });
});
