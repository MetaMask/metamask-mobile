import {
  MOCK_FEATURE_ANNOUNCEMENT_NOTIFICATIONS,
  MOCK_ON_CHAIN_NOTIFICATIONS,
} from '../../../app/components/UI/Notification/__mocks__/mock_notifications';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { AvatarAccountType } from '../../../app/component-library/components/Avatars/Avatar';

/**
 * Notifications fixture mirroring the smoke `withDefaultFixture()` mocks: the same
 * on-chain wallet notifications + one feature announcement (`MOCK_NOTIFICATIONS`),
 * but seeded directly into Redux instead of fetched via mockttp.
 *
 * Smoke E2E refs:
 * - tests/smoke/notifications/enable-notifications-after-onboarding.spec.ts
 * - tests/smoke/notifications/utils/mocks.ts
 */
export const MOCK_NOTIFICATIONS = [
  ...MOCK_FEATURE_ANNOUNCEMENT_NOTIFICATIONS,
  ...MOCK_ON_CHAIN_NOTIFICATIONS,
];

export const FEATURE_ANNOUNCEMENT_ID =
  MOCK_FEATURE_ANNOUNCEMENT_NOTIFICATIONS[0].id;

export const WALLET_NOTIFICATION_IDS = MOCK_ON_CHAIN_NOTIFICATIONS.map(
  (n) => n.id,
);

/**
 * Single HD wallet + EVM account used by the notification settings preset so
 * `useFirstHDWalletAccounts` resolves and `AccountsList` renders one toggle for
 * `NOTIFICATIONS_ACCOUNT_ADDRESS` (parity with smoke `DEFAULT_FIXTURE_ACCOUNT_CHECKSUM`).
 */
export const NOTIFICATIONS_ACCOUNT_ADDRESS =
  '0x0000000000000000000000000000000000000001';
const NOTIFICATIONS_ACCOUNT_ID = 'acc-notifications-1';
const NOTIFICATIONS_HD_WALLET_ID = 'entropy:wallet1';
const NOTIFICATIONS_HD_GROUP_ID = 'entropy:wallet1/0';

interface NotificationsPresetOptions {
  notificationsEnabled?: boolean;
  featureAnnouncementsEnabled?: boolean;
  pushEnabled?: boolean;
  notifications?: typeof MOCK_NOTIFICATIONS;
}

/**
 * Redux preset for Notification view + settings CV tests.
 *
 * Seeds the controllers used by `selectIs*` selectors and `getNotificationsList`
 * so the screen renders the same data the E2E sees after the controller fetches.
 *
 * `AccountsController` + `AccountTreeController` are seeded with one HD wallet
 * group containing one EVM account so `AccountsList` renders the per-account
 * toggle in the settings flow without mocking any hooks.
 */
export function buildNotificationsState(
  options: NotificationsPresetOptions = {},
): DeepPartial<RootState> {
  const {
    notificationsEnabled = true,
    featureAnnouncementsEnabled = true,
    pushEnabled = true,
    notifications = MOCK_NOTIFICATIONS,
  } = options;

  return {
    settings: {
      basicFunctionalityEnabled: true,
      avatarAccountType: AvatarAccountType.Maskicon,
    } as DeepPartial<RootState>['settings'],
    engine: {
      backgroundState: {
        NotificationServicesController: {
          isNotificationServicesEnabled: notificationsEnabled,
          isMetamaskNotificationsFeatureSeen: true,
          isUpdatingMetamaskNotifications: false,
          isFetchingMetamaskNotifications: false,
          isFeatureAnnouncementsEnabled: featureAnnouncementsEnabled,
          isPerpsNotificationsEnabled: false,
          isUpdatingMetamaskNotificationsAccount: [],
          isCheckingAccountsPresence: false,
          metamaskNotificationsReadList: [],
          metamaskNotificationsList: notifications,
          subscriptionAccountsSeen: [NOTIFICATIONS_ACCOUNT_ADDRESS],
        },
        NotificationServicesPushController: {
          isPushEnabled: pushEnabled,
          isUpdatingFCMToken: false,
          fcmToken: 'mock-fcm-token',
        },
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            assetsNotificationsEnabled: true,
          },
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              [NOTIFICATIONS_ACCOUNT_ID]: {
                id: NOTIFICATIONS_ACCOUNT_ID,
                address: NOTIFICATIONS_ACCOUNT_ADDRESS,
                metadata: {
                  name: 'Account 1',
                  importTime: 0,
                  keyring: { type: 'HD Key Tree' },
                },
                options: {},
                methods: [
                  'personal_sign',
                  'eth_sign',
                  'eth_signTransaction',
                  'eth_signTypedData_v1',
                  'eth_signTypedData_v3',
                  'eth_signTypedData_v4',
                ],
                type: 'eip155:eoa',
                scopes: ['eip155:0'],
              },
            },
            selectedAccount: NOTIFICATIONS_ACCOUNT_ID,
          },
        },
        AccountTreeController: {
          accountTree: {
            wallets: {
              [NOTIFICATIONS_HD_WALLET_ID]: {
                id: NOTIFICATIONS_HD_WALLET_ID,
                type: 'entropy',
                metadata: {
                  name: 'Wallet 1',
                  entropy: { id: 'wallet1' },
                },
                groups: {
                  [NOTIFICATIONS_HD_GROUP_ID]: {
                    id: NOTIFICATIONS_HD_GROUP_ID,
                    type: 'MultipleAccount',
                    metadata: {
                      name: 'Account 1',
                      pinned: false,
                      hidden: false,
                      lastSelected: 0,
                    },
                    accounts: [NOTIFICATIONS_ACCOUNT_ID],
                  },
                },
              },
            },
          },
          selectedAccountGroup: NOTIFICATIONS_HD_GROUP_ID,
        },
      },
    } as DeepPartial<RootState>['engine'],
  };
}
