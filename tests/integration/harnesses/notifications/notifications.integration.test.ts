/**
 * Integration test — notification settings toggles.
 *
 * Exercises the real NotificationServicesController +
 * NotificationServicesPushController pair (production messenger wiring) with
 * only the HTTP and FCM/native push boundaries mocked: master toggle,
 * wallet-activity (account-level) toggles, feature-announcements toggle, and
 * the Trigger API rejection path.
 */

import {
  TRIGGER_TYPES,
  type INotification,
} from '@metamask/notification-services-controller/notification-services';

import {
  buildNotificationsIntegrationHarness,
  HARNESS_ACCOUNT_A,
  HARNESS_ACCOUNT_B,
  HARNESS_BEARER_TOKEN,
  HARNESS_FCM_TOKEN,
  PUSH_API_TOKEN_ENDPOINT,
  TRIGGER_API_NOTIFICATIONS_ENDPOINT,
  TRIGGER_API_QUERY_ENDPOINT,
  type NotificationsIntegrationHarness,
} from './notifications';

const AUTH_HEADER = { Authorization: `Bearer ${HARNESS_BEARER_TOKEN}` };

function fetchSubscribeCalls(harness: NotificationsIntegrationHarness) {
  return harness.fetchCalls(TRIGGER_API_NOTIFICATIONS_ENDPOINT, '/query');
}

function buildSnapNotification(id: string): INotification {
  return {
    id,
    notification_subtype: 'unknown',
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    isRead: false,
    type: TRIGGER_TYPES.SNAP,
    readDate: null,
    data: {
      message: 'test snap message',
      origin: '@metamask/test-snap',
    },
  } as INotification;
}

describe('Notifications settings toggles — integration', () => {
  describe('master toggle (enable / disable notification services)', () => {
    it('first-time enable seeds AUS preferences, subscribes keyring accounts on the Trigger API and flips the settings state', async () => {
      // Arrange
      const harness = buildNotificationsIntegrationHarness();

      // Act
      await harness.notificationServicesController.enableMetamaskNotifications({
        hasMarketingConsent: true,
        productAnnouncementEnabled: false,
      });

      // Assert
      const { state } = harness.notificationServicesController;
      expect(state.isNotificationServicesEnabled).toBe(true);
      expect(state.isFeatureAnnouncementsEnabled).toBe(true);
      expect(state.isMetamaskNotificationsFeatureSeen).toBe(true);
      expect(state.isUpdatingMetamaskNotifications).toBe(false);

      expect(harness.mocks.getNotificationPreferences).toHaveBeenCalledTimes(1);
      expect(harness.mocks.putNotificationPreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          walletActivity: {
            inAppNotificationsEnabled: true,
            pushNotificationsEnabled: true,
            accounts: [],
          },
          marketing: {
            inAppNotificationsEnabled: false,
            pushNotificationsEnabled: true,
          },
        }),
        'mobile',
      );

      const subscribeCalls = fetchSubscribeCalls(harness);
      expect(subscribeCalls).toHaveLength(1);
      const subscribeCall = subscribeCalls[0];
      expect(subscribeCall.method).toBe('POST');
      expect(subscribeCall.headers).toEqual(
        expect.objectContaining(AUTH_HEADER),
      );
      expect(JSON.parse(subscribeCall.body)).toEqual([
        { address: HARNESS_ACCOUNT_A, enabled: true },
      ]);
    });

    it('first-time enable registers the FCM token and links it to the keyring accounts through the real push controller', async () => {
      // Arrange
      const harness = buildNotificationsIntegrationHarness();

      // Act
      await harness.notificationServicesController.enableMetamaskNotifications();
      await harness.waitFor(
        () =>
          harness.mocks.pushService.subscribeToPushNotifications.mock.calls
            .length > 0,
      );

      // Assert
      expect(harness.mocks.pushService.createRegToken).toHaveBeenCalledTimes(1);
      expect(harness.pushController.state.fcmToken).toBe(HARNESS_FCM_TOKEN);
      expect(harness.pushController.state.isPushEnabled).toBe(true);
      expect(harness.pushController.state.isUpdatingFCMToken).toBe(false);

      const linkCalls = harness.fetchCalls(PUSH_API_TOKEN_ENDPOINT);
      expect(linkCalls).toHaveLength(1);
      const linkCall = linkCalls[0];
      expect(linkCall.method).toBe('POST');
      expect(linkCall.headers).toEqual(expect.objectContaining(AUTH_HEADER));
      expect(JSON.parse(linkCall.body)).toEqual({
        addresses: [HARNESS_ACCOUNT_A],
        registration_token: expect.objectContaining({
          token: HARNESS_FCM_TOKEN,
          platform: 'mobile',
        }),
      });
    });

    it('master toggle off removes the FCM token, clears the enabled flags and keeps snap notifications', async () => {
      // Arrange
      const harness = buildNotificationsIntegrationHarness({
        initialPushState: { fcmToken: HARNESS_FCM_TOKEN },
        initialState: {
          metamaskNotificationsList: [
            buildSnapNotification('snap-keep-me'),
            buildSnapNotification('snap-too'),
          ],
        },
      });

      // Act
      await harness.notificationServicesController.disableNotificationServices();

      // Assert
      expect(harness.mocks.pushService.deleteRegToken).toHaveBeenCalledTimes(1);
      expect(harness.pushController.state.isPushEnabled).toBe(false);
      expect(harness.pushController.state.isUpdatingFCMToken).toBe(false);
      const { state } = harness.notificationServicesController;
      expect(state.isNotificationServicesEnabled).toBe(false);
      expect(state.isFeatureAnnouncementsEnabled).toBe(false);
      expect(state.isUpdatingMetamaskNotifications).toBe(false);
      expect(
        state.metamaskNotificationsList.map((notification) => notification.id),
      ).toEqual(['snap-keep-me', 'snap-too']);
    });

    it('re-enabling after a disable re-registers the FCM token carrying the previous token', async () => {
      // Arrange
      const harness = buildNotificationsIntegrationHarness({
        initialPushState: { fcmToken: HARNESS_FCM_TOKEN },
      });
      await harness.notificationServicesController.disableNotificationServices();
      harness.mocks.pushService.createRegToken.mockClear();

      // Act
      await harness.notificationServicesController.enableMetamaskNotifications();
      await harness.waitFor(
        () => harness.pushController.state.isPushEnabled === true,
      );

      // Assert
      expect(harness.mocks.pushService.createRegToken).toHaveBeenCalledTimes(1);
      const linkCalls = harness.fetchCalls(PUSH_API_TOKEN_ENDPOINT);
      expect(linkCalls).toHaveLength(1);
      const linkCall = linkCalls[0];
      expect(JSON.parse(linkCall.body).registration_token).toEqual(
        expect.objectContaining({ oldToken: HARNESS_FCM_TOKEN }),
      );
    });
  });

  describe('feature announcements toggle', () => {
    it('writes only the local feature-announcements flag without any API or push side effects', async () => {
      // Arrange
      const harness = buildNotificationsIntegrationHarness();

      // Act
      await harness.notificationServicesController.setFeatureAnnouncementsEnabled(
        true,
      );

      // Assert
      expect(
        harness.notificationServicesController.state
          .isFeatureAnnouncementsEnabled,
      ).toBe(true);
      expect(
        harness.notificationServicesController.state
          .isNotificationServicesEnabled,
      ).toBe(false);
      expect(harness.mocks.fetch).not.toHaveBeenCalled();
      expect(harness.mocks.putNotificationPreferences).not.toHaveBeenCalled();

      // Act — toggling back off
      await harness.notificationServicesController.setFeatureAnnouncementsEnabled(
        false,
      );

      // Assert
      expect(
        harness.notificationServicesController.state
          .isFeatureAnnouncementsEnabled,
      ).toBe(false);
    });
  });

  describe('wallet-activity (account-level) toggles', () => {
    it('enabling wallet activity for an account writes an enabled subscription to the Trigger API without touching push', async () => {
      // Arrange
      const harness = buildNotificationsIntegrationHarness();

      // Act
      await harness.notificationServicesController.enableAccounts([
        HARNESS_ACCOUNT_A,
      ]);

      // Assert
      const subscribeCalls = fetchSubscribeCalls(harness);
      expect(subscribeCalls).toHaveLength(1);
      const subscribeCall = subscribeCalls[0];
      expect(subscribeCall.method).toBe('POST');
      expect(subscribeCall.headers).toEqual(
        expect.objectContaining(AUTH_HEADER),
      );
      expect(JSON.parse(subscribeCall.body)).toEqual([
        { address: HARNESS_ACCOUNT_A, enabled: true },
      ]);
      expect(harness.mocks.pushService.createRegToken).not.toHaveBeenCalled();
      expect(harness.fetchCalls(PUSH_API_TOKEN_ENDPOINT)).toHaveLength(0);
      expect(
        harness.notificationServicesController.state
          .isUpdatingMetamaskNotificationsAccount,
      ).toEqual([]);
    });

    it('disabling wallet activity for an account writes a disabled subscription to the Trigger API', async () => {
      // Arrange
      const harness = buildNotificationsIntegrationHarness();

      // Act
      await harness.notificationServicesController.disableAccounts([
        HARNESS_ACCOUNT_A,
      ]);

      // Assert
      const subscribeCalls = fetchSubscribeCalls(harness);
      expect(subscribeCalls).toHaveLength(1);
      const subscribeCall = subscribeCalls[0];
      expect(JSON.parse(subscribeCall.body)).toEqual([
        { address: HARNESS_ACCOUNT_A, enabled: false },
      ]);
      expect(harness.mocks.pushService.deleteRegToken).not.toHaveBeenCalled();
      expect(
        harness.notificationServicesController.state
          .isUpdatingMetamaskNotificationsAccount,
      ).toEqual([]);
    });

    it('rejects with the settings error when the Trigger API rejects the disable write and leaves no account in the updating state', async () => {
      // Arrange
      const harness = buildNotificationsIntegrationHarness();
      harness.setHttpResponse(TRIGGER_API_NOTIFICATIONS_ENDPOINT, {
        status: 500,
      });

      // Act
      const disablePromise =
        harness.notificationServicesController.disableAccounts([
          HARNESS_ACCOUNT_A,
        ]);

      // Assert
      await expect(disablePromise).rejects.toThrow(
        'Failed to delete OnChain triggers',
      );
      expect(
        harness.notificationServicesController.state
          .isUpdatingMetamaskNotificationsAccount,
      ).toEqual([]);
    });

    it('rejects the master enable and leaves state untouched when the Trigger API subscription read fails', async () => {
      // Arrange
      const harness = buildNotificationsIntegrationHarness();
      harness.setHttpResponse(TRIGGER_API_QUERY_ENDPOINT, { status: 500 });

      // Act
      const enablePromise =
        harness.notificationServicesController.enableMetamaskNotifications();

      // Assert
      await expect(enablePromise).rejects.toThrow(
        'Unable to enable notifications',
      );
      const { state } = harness.notificationServicesController;
      expect(state.isNotificationServicesEnabled).toBe(false);
      expect(state.isFeatureAnnouncementsEnabled).toBe(false);
      expect(harness.mocks.putNotificationPreferences).not.toHaveBeenCalled();
      expect(fetchSubscribeCalls(harness)).toHaveLength(0);
    });

    it('checkAccountsPresence maps the Trigger API subscription config onto each requested account', async () => {
      // Arrange
      const harness = buildNotificationsIntegrationHarness();
      harness.setHttpResponse(TRIGGER_API_QUERY_ENDPOINT, {
        json: [
          { address: HARNESS_ACCOUNT_A, enabled: true },
          { address: HARNESS_ACCOUNT_B, enabled: false },
        ],
      });

      // Act
      const presence =
        await harness.notificationServicesController.checkAccountsPresence([
          HARNESS_ACCOUNT_A,
          HARNESS_ACCOUNT_B,
        ]);

      // Assert
      expect(presence).toEqual({
        [HARNESS_ACCOUNT_A]: true,
        [HARNESS_ACCOUNT_B]: false,
      });
      const queryCalls = harness.fetchCalls(TRIGGER_API_QUERY_ENDPOINT);
      expect(queryCalls).toHaveLength(1);
      const queryCall = queryCalls[0];
      expect(queryCall.method).toBe('POST');
      expect(queryCall.headers).toEqual(expect.objectContaining(AUTH_HEADER));
      expect(JSON.parse(queryCall.body)).toEqual([
        { address: HARNESS_ACCOUNT_A },
        { address: HARNESS_ACCOUNT_B },
      ]);
    });
  });
});
