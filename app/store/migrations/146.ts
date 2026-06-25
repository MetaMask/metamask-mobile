import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';

const MIGRATION_VERSION = 146;

/**
 * Legacy MMKV key prefix used by `useCampaignReminderActions` before campaign
 * "Notify me" reminder subscriptions were moved into Redux. Each subscription
 * was stored as its own key, `rewards_campaign_reminder_subscribed::${subscriptionId}:${campaignId}`,
 * with the value `'1'`. The suffix after the prefix is exactly the
 * `${subscriptionId}:${campaignId}` composite key used by the Redux map, so it
 * can be reused verbatim.
 */
const LEGACY_REMINDER_KEY_PREFIX = 'rewards_campaign_reminder_subscribed::';
const LEGACY_REMINDER_SUBSCRIBED_VALUE = '1';

/**
 * Migration 146: Carry campaign "Notify me" reminder subscriptions over from the
 * standalone MMKV keys into the persisted `rewards.subscribedCampaignReminders`
 * Redux map, then delete the now-orphaned MMKV keys.
 *
 * Context: reminder subscriptions used to live in MMKV (one key per
 * subscription:campaign) and were read synchronously on mount. They now live in
 * the persisted rewards Redux slice so they share the same persistence and
 * rehydrate path as the other campaign-scoped state. Without this migration,
 * users who already tapped "Notify me" on an upcoming campaign would lose that
 * state on upgrade and see the CTA reappear.
 *
 * Safe by design: the carry-over is written to state before any key deletion,
 * deletion failures are swallowed per key, and any unexpected error returns the
 * state untouched so the upgrade can never be blocked by this migration.
 *
 * @param state - The persisted Redux state
 * @returns The migrated Redux state
 */
export default async function migrate(state: unknown): Promise<unknown> {
  if (!ensureValidState(state, MIGRATION_VERSION)) {
    return state;
  }

  try {
    // If the rewards slice was never persisted (user never opened Rewards) there
    // is nothing to migrate — and there can be no legacy reminder keys either.
    if (!hasProperty(state, 'rewards') || !isObject(state.rewards)) {
      return state;
    }

    const existingReminders = isObject(
      state.rewards.subscribedCampaignReminders,
    )
      ? (state.rewards.subscribedCampaignReminders as Record<string, boolean>)
      : {};

    const subscribedCampaignReminders: Record<string, boolean> = {
      ...existingReminders,
    };

    const allKeys = await StorageWrapper.getAllKeys();
    const legacyKeys = (allKeys ?? []).filter(
      (key): key is string =>
        typeof key === 'string' && key.startsWith(LEGACY_REMINDER_KEY_PREFIX),
    );

    for (const key of legacyKeys) {
      if (
        StorageWrapper.getItemSync(key) === LEGACY_REMINDER_SUBSCRIBED_VALUE
      ) {
        const compositeKey = key.slice(LEGACY_REMINDER_KEY_PREFIX.length);
        if (compositeKey) {
          subscribedCampaignReminders[compositeKey] = true;
        }
      }
    }

    state.rewards.subscribedCampaignReminders = subscribedCampaignReminders;

    // Best-effort cleanup of the now-unused MMKV keys. The data is already
    // carried over above, so a failure to delete an individual key must not fail
    // the migration.
    await Promise.all(
      legacyKeys.map(async (key) => {
        try {
          await StorageWrapper.removeItem(key);
        } catch {
          // Ignore individual key cleanup failures.
        }
      }),
    );

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${MIGRATION_VERSION}: Failed to migrate campaign reminder subscriptions from MMKV to Redux. Error: ${error}`,
      ),
    );
    return state;
  }
}
