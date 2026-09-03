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
 * Redux map, then delete the migrated MMKV keys.
 *
 * Context: reminder subscriptions used to live in MMKV (one key per
 * subscription:campaign) and were read synchronously on mount. They now live in
 * the persisted rewards Redux slice so they share the same persistence and
 * rehydrate path as the other campaign-scoped state. Without this migration,
 * users who already tapped "Notify me" on an upcoming campaign would lose that
 * state on upgrade and see the CTA reappear.
 *
 * Safe by design. The MMKV keys are read independently of whether the `rewards`
 * slice is already present in persisted state (the slice is created if
 * redux-persist omitted it), so subscriptions are never skipped. A key is only
 * deleted when it was positively read as subscribed and copied;
 * `StorageWrapper.getItemSync` returns `null` on a read failure, so an unreadable
 * key is left untouched in both Redux and MMKV rather than being silently
 * dropped. The carry-over is written to state before any deletion, per-key
 * deletion failures are swallowed, and any unexpected error returns the state
 * untouched so the upgrade can never be blocked by this migration.
 *
 * @param state - The persisted Redux state
 * @returns The migrated Redux state
 */
export default async function migrate(state: unknown): Promise<unknown> {
  if (!ensureValidState(state, MIGRATION_VERSION)) {
    return state;
  }

  try {
    const allKeys = await StorageWrapper.getAllKeys();
    const legacyKeys = (allKeys ?? []).filter(
      (key): key is string =>
        typeof key === 'string' && key.startsWith(LEGACY_REMINDER_KEY_PREFIX),
    );

    // Collect only the keys we can positively read as subscribed. A key whose
    // value cannot be read (`getItemSync` returns `null` on read failure) is
    // intentionally left out of `migratedKeys` below, so it is never deleted —
    // a transient read failure can therefore never silently drop a reminder.
    const migratedReminders: Record<string, boolean> = {};
    const migratedKeys: string[] = [];
    for (const key of legacyKeys) {
      if (
        StorageWrapper.getItemSync(key) === LEGACY_REMINDER_SUBSCRIBED_VALUE
      ) {
        const compositeKey = key.slice(LEGACY_REMINDER_KEY_PREFIX.length);
        if (compositeKey) {
          migratedReminders[compositeKey] = true;
          migratedKeys.push(key);
        }
      }
    }

    // Nothing to carry over — leave the persisted state exactly as-is and do not
    // fabricate a rewards slice.
    if (migratedKeys.length === 0) {
      return state;
    }

    // Merge into the rewards slice, creating it if redux-persist omitted it.
    // This must not depend on the rewards slice already being present: a user can
    // have legacy reminder keys while `rewards` is absent from persisted state,
    // and those subscriptions still need to be carried over.
    const existingRewards: Record<string, unknown> =
      hasProperty(state, 'rewards') && isObject(state.rewards)
        ? state.rewards
        : {};
    const existingReminders = isObject(
      existingRewards.subscribedCampaignReminders,
    )
      ? (existingRewards.subscribedCampaignReminders as Record<string, boolean>)
      : {};

    (state as unknown as Record<string, unknown>).rewards = {
      ...existingRewards,
      subscribedCampaignReminders: {
        ...existingReminders,
        ...migratedReminders,
      },
    };

    // Best-effort cleanup of only the keys we successfully migrated. The data is
    // already carried over above, so a failure to delete an individual key must
    // not fail the migration.
    await Promise.all(
      migratedKeys.map(async (key) => {
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
