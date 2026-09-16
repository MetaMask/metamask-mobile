/**
 * Redux state preset for Top Traders / Social Leaderboard component view tests.
 *
 * Enables all social-leaderboard remote feature flags, seeds an unlocked keyring,
 * notification service state, and an empty SocialController following list so
 * every trader row starts with a "Follow" button.
 */

import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { createStateFixture } from '../stateFixture';

export interface SocialLeaderboardPresetOptions {
  /** Master feature gate. Default: true. */
  featureEnabled?: boolean;
  /** Perps tab gate. Default: true. */
  perpsEnabled?: boolean;
  /** Privacy opt-in/out flow gate (Settings section). Default: true. */
  optFlowEnabled?: boolean;
  /**
   * IDs of traders the current user already follows.
   * Used to seed SocialController.followingProfileIds so rows show
   * "Following" / mute chip without network calls.
   * Default: [] (no follows).
   */
  followingProfileIds?: string[];
  /**
   * Whether the user has opted in to appearing on the leaderboard.
   * Drives the settings toggle initial state.
   * Default: true.
   */
  showAccountOnLeaderboard?: boolean;
  /**
   * Whether MetaMask notifications are enabled at the master level.
   * Default: true.
   */
  notificationsEnabled?: boolean;
}

function makeVersionFlag(enabled: boolean) {
  return { enabled, minimumVersion: '0.0.1' };
}

/**
 * Returns a `StateFixtureBuilder` configured for Social Leaderboard CV tests.
 * Call `.build()` to produce the state object, or chain `.withOverrides(...)`.
 */
export function initialStateSocialLeaderboard(
  options: SocialLeaderboardPresetOptions = {},
) {
  const {
    featureEnabled = true,
    perpsEnabled = true,
    optFlowEnabled = true,
    followingProfileIds = [],
    showAccountOnLeaderboard = true,
    notificationsEnabled = true,
  } = options;

  return createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withRemoteFeatureFlags({
      aiSocialLeaderboardEnabled: makeVersionFlag(featureEnabled),
      aiSocialLeaderboardPerpsEnabled: makeVersionFlag(perpsEnabled),
      aiSocialLeaderboardOptFlowEnabled: makeVersionFlag(optFlowEnabled),
      // Cache-refresh flag: off by default to avoid extra calls in tests.
      aiSocialAusCacheRefreshEnabled: makeVersionFlag(false),
    })
    .withOverrides({
      engine: {
        backgroundState: {
          // isUnlocked: true so useTopTraders query is enabled.
          KeyringController: { isUnlocked: true, keyrings: [] },
          NotificationServicesController: {
            isNotificationServicesEnabled: notificationsEnabled,
            isFeatureAnnouncementsEnabled: true,
            isMetamaskNotificationsFeatureSeen: true,
            isUpdatingMetamaskNotifications: false,
            isFetchingMetamaskNotifications: false,
            isUpdatingMetamaskNotificationsAccount: [],
            metamaskNotificationsReadList: [],
            metamaskNotificationsList: [],
          },
          NotificationServicesPushController: {
            isPushEnabled: notificationsEnabled,
            isUpdatingFCMToken: false,
            fcmToken: 'mock-fcm-token',
          },
          // SocialController.followingProfileIds drives isFollowing() in
          // useFollowToggleMany without any additional API calls.
          SocialController: { followingProfileIds },
        },
      },
      settings: {
        showAccountOnLeaderboard,
        basicFunctionalityEnabled: true,
      },
    } as DeepPartial<RootState>);
}
