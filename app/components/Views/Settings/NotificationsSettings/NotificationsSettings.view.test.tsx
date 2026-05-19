import '../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderComponentViewScreen } from '../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  buildNotificationsState,
  NOTIFICATIONS_ACCOUNT_ADDRESS,
} from '../../../../../tests/component-view/presets/notifications';
import NotificationsSettings from './';
import {
  NotificationSettingsViewSelectorsIDs,
  NotificationSettingsViewSelectorsText,
} from './NotificationSettingsView.testIds';
import Engine from '../../../../core/Engine';

/**
 * Component-view coverage for smoke `notification-settings-flow`.
 *
 * Smoke spec: tests/smoke/notifications/notification-settings-flow.spec.ts
 *
 * No hooks, selectors or services are mocked here — the per-account toggle
 * resolves from real `AccountTreeController` + `AccountsController` state
 * seeded by `buildNotificationsState`. The feature flag check resolves true
 * via `IS_TEST=true` (set at config-load time in `jest.config.view.js`).
 */

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

describeForPlatforms('Notifications settings (toggles + visibility)', () => {
  it('renders all sub-toggles when notifications are enabled', async () => {
    const { getByTestId, findByText } = renderSettings();

    expect(
      getByTestId(NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE),
    ).toBeOnTheScreen();

    expect(
      await waitFor(() =>
        getByTestId(
          NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
        ),
      ),
    ).toBeOnTheScreen();

    expect(
      getByTestId(
        NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
      ),
    ).toBeOnTheScreen();

    expect(
      await findByText(
        NotificationSettingsViewSelectorsText.ACCOUNT_ACTIVITY_SECTION,
      ),
    ).toBeOnTheScreen();

    expect(
      getByTestId(
        NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
          NOTIFICATIONS_ACCOUNT_ADDRESS,
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('hides push, feature announcements and account section when main toggle is off', async () => {
    const { getByTestId, queryByTestId, queryByText } = renderSettings({
      notificationsEnabled: false,
    });

    expect(
      getByTestId(NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE),
    ).toBeOnTheScreen();

    await waitFor(() => {
      expect(
        queryByTestId(
          NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
        ),
      ).toBeNull();
    });
    expect(
      queryByTestId(
        NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
      ),
    ).toBeNull();
    expect(
      queryByText(
        NotificationSettingsViewSelectorsText.ACCOUNT_ACTIVITY_SECTION,
      ),
    ).toBeNull();
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

  it('invokes setFeatureAnnouncementsEnabled(false) when the feature announcements toggle is pressed', async () => {
    const toggleSpy = jest
      .spyOn(
        Engine.context.NotificationServicesController as unknown as {
          setFeatureAnnouncementsEnabled: (val: boolean) => Promise<void>;
        },
        'setFeatureAnnouncementsEnabled',
      )
      .mockResolvedValue(undefined);

    try {
      const { getByTestId } = renderSettings();

      fireEvent(
        getByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
        ),
        'onChange',
        { nativeEvent: { value: false } },
      );

      await waitFor(() => {
        expect(toggleSpy).toHaveBeenCalledWith(false);
      });
    } finally {
      toggleSpy.mockRestore();
    }
  });

  /**
   * The per-account toggle's initial state comes from
   * `Engine.NotificationServicesController.checkAccountsPresence`, which our
   * Engine stub resolves to `{}` by default → toggle starts OFF. Pressing it
   * therefore calls `enableAccounts` (off → on); the inverse direction is
   * symmetrical. We assert the wiring through the press, not the direction.
   */
  it('invokes enableAccounts with the account address when the per-account toggle is pressed', async () => {
    const enableAccountsSpy = jest
      .spyOn(
        Engine.context.NotificationServicesController as unknown as {
          enableAccounts: (addresses: string[]) => Promise<void>;
        },
        'enableAccounts',
      )
      .mockResolvedValue(undefined);

    try {
      const { getByTestId } = renderSettings();

      fireEvent(
        getByTestId(
          NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
            NOTIFICATIONS_ACCOUNT_ADDRESS,
          ),
        ),
        'onChange',
        { nativeEvent: { value: true } },
      );

      await waitFor(() => {
        expect(enableAccountsSpy).toHaveBeenCalledWith([
          NOTIFICATIONS_ACCOUNT_ADDRESS,
        ]);
      });
    } finally {
      enableAccountsSpy.mockRestore();
    }
  });
});
