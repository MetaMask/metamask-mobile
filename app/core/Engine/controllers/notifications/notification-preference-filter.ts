import type { INotification } from '@metamask/notification-services-controller/notification-services';
import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import Engine from '../../../Engine';
import Logger from '../../../../util/Logger';

const GET_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;

/**
 * The preference sections that map to user-configurable notification categories.
 * These correspond to the sections in Settings → Notifications.
 */
export type NotificationPreferenceSection = keyof NotificationPreferences;

/**
 * Perps notification kinds delivered via PLATFORM trigger type.
 * These are identified by the `kind` field in the notification's data/metadata.
 */
const PERPS_NOTIFICATION_KINDS = new Set([
  'position_liquidated',
  'stop_loss_executed',
  'stop_loss_triggered',
  'take_profit_executed',
  'take_profit_triggered',
  'limit_order_filled',
]);

/**
 * Social AI / trader notification kinds delivered via PLATFORM trigger type.
 */
const SOCIAL_AI_NOTIFICATION_KINDS = new Set([
  'social_trade',
  'trader_trade',
  'followed_trader_trade',
]);

/**
 * Maps on-chain TRIGGER_TYPES to their notification preference section.
 * On-chain notification types (ERC20, ETH, staking, swaps) map to 'walletActivity'.
 */
const ON_CHAIN_TRIGGER_TO_SECTION: Partial<
  Record<TRIGGER_TYPES, NotificationPreferenceSection>
> = {
  [TRIGGER_TYPES.ERC20_SENT]: 'walletActivity',
  [TRIGGER_TYPES.ERC20_RECEIVED]: 'walletActivity',
  [TRIGGER_TYPES.ERC721_SENT]: 'walletActivity',
  [TRIGGER_TYPES.ERC721_RECEIVED]: 'walletActivity',
  [TRIGGER_TYPES.ERC1155_SENT]: 'walletActivity',
  [TRIGGER_TYPES.ERC1155_RECEIVED]: 'walletActivity',
  [TRIGGER_TYPES.ETH_SENT]: 'walletActivity',
  [TRIGGER_TYPES.ETH_RECEIVED]: 'walletActivity',
  [TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED]: 'walletActivity',
  [TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED]: 'walletActivity',
  [TRIGGER_TYPES.LIDO_STAKE_COMPLETED]: 'walletActivity',
  [TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED]: 'walletActivity',
  [TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED]: 'walletActivity',
  [TRIGGER_TYPES.METAMASK_SWAP_COMPLETED]: 'walletActivity',
  [TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN]: 'walletActivity',
};

/**
 * Extracts the `kind` string from a platform notification's data payload.
 * Platform notifications (perps, social AI) embed a `kind` field in their data
 * that identifies the specific notification sub-type.
 */
function extractNotificationKind(
  notification: INotification,
): string | undefined {
  try {
    // INotification data can carry arbitrary fields depending on the trigger type.
    // Platform notifications embed a `kind` field (or nested in data/metadata).
    const data = notification.data as Record<string, unknown> | undefined;
    if (data?.kind && typeof data.kind === 'string') {
      return data.kind;
    }

    // Some platform notifications nest kind inside a `metadata` object
    const metadata = data?.metadata as Record<string, unknown> | undefined;
    if (metadata?.kind && typeof metadata.kind === 'string') {
      return metadata.kind;
    }
  } catch {
    // Malformed data — fall through to undefined
  }
  return undefined;
}

/**
 * Determines the notification preference section for a given notification.
 * Returns `null` when the notification type is unknown or should not be filtered
 * (e.g., feature announcements have their own separate toggle).
 *
 * @param notification - The processed notification from the push payload.
 * @returns The preference section key, or `null` if no filtering applies.
 */
export function getPreferenceSectionForNotification(
  notification: INotification,
): NotificationPreferenceSection | null {
  // On-chain notification types have a direct mapping
  const onChainSection = ON_CHAIN_TRIGGER_TO_SECTION[notification.type];
  if (onChainSection) {
    return onChainSection;
  }

  // Platform notifications need sub-classification by `kind`
  if (notification.type === TRIGGER_TYPES.PLATFORM) {
    const kind = extractNotificationKind(notification);
    if (kind) {
      if (PERPS_NOTIFICATION_KINDS.has(kind)) {
        return 'perps';
      }
      if (SOCIAL_AI_NOTIFICATION_KINDS.has(kind)) {
        return 'socialAI';
      }
    }
    // Unknown platform notification kind — don't filter (safe fallback)
    return null;
  }

  // Feature announcements and unknown types — don't filter
  return null;
}

/**
 * Fetches the current notification preferences from AuthenticatedUserStorageService.
 * Returns `null` if preferences are not available (user not logged in, etc.).
 */
async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  try {
    const preferences = await Engine.controllerMessenger.call(
      GET_NOTIFICATION_PREFERENCES_ACTION,
    );
    return (preferences as NotificationPreferences) ?? null;
  } catch (error) {
    Logger.log(
      'notification-preference-filter: failed to fetch preferences',
      error,
    );
    return null;
  }
}

/**
 * Checks whether a push notification should be suppressed based on the user's
 * notification preferences. This is the client-side safety net that prevents
 * displaying notifications the user has disabled, even if the server
 * continues to send them (e.g., due to propagation delay).
 *
 * @param notification - The processed notification from the push payload.
 * @returns `true` if the notification should NOT be displayed, `false` otherwise.
 */
export async function isNotificationSuppressedByPreferences(
  notification: INotification,
): Promise<boolean> {
  try {
    const section = getPreferenceSectionForNotification(notification);

    // No preference section mapped — show by default (safe fallback)
    if (!section) {
      return false;
    }

    const preferences = await getNotificationPreferences();

    // Preferences not available — show by default (avoid blocking notifications
    // when the user hasn't set up preferences yet or when fetch fails)
    if (!preferences) {
      return false;
    }

    const sectionPrefs = preferences[section];
    if (!sectionPrefs) {
      return false;
    }

    // Check if push notifications are disabled for this section
    if (sectionPrefs.pushNotificationsEnabled === false) {
      return true;
    }

    // For socialAI section, also check per-trader muting
    if (section === 'socialAI' && 'mutedTraderProfileIds' in sectionPrefs) {
      const socialPrefs = sectionPrefs as NotificationPreferences['socialAI'];
      const data = notification.data as Record<string, unknown> | undefined;
      const traderId = data?.traderId ?? data?.trader_id;
      if (
        typeof traderId === 'string' &&
        socialPrefs.mutedTraderProfileIds?.includes(traderId)
      ) {
        return true;
      }
    }

    return false;
  } catch (error) {
    // On any error, fail open — show the notification rather than silently dropping it
    Logger.log(
      'notification-preference-filter: error checking preferences, showing notification',
      error,
    );
    return false;
  }
}
