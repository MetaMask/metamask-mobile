import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StorageWrapper from '../../../../store/storage-wrapper';

const REMINDER_SUBSCRIBED_VALUE = '1';

export function buildCampaignReminderCompositeKey(
  subscriptionId: string,
  campaignId: string,
): string {
  return `${subscriptionId}:${campaignId}`;
}

/**
 * One MMKV key per subscription:campaign reminder (no shared JSON list).
 */
export function reminderStorageKeyForComposite(compositeKey: string): string {
  return `rewards_campaign_reminder_subscribed::${compositeKey}`;
}

/**
 * Local "Remind me" state scoped by Rewards subscription + campaign.
 * CTA is shown only after hydration when this composite row is not stored.
 */
export function useCampaignReminderSubscription(options: {
  subscriptionId: string | null | undefined;
  campaignId: string;
  enabled: boolean;
}): {
  showRemindMeCta: boolean;
  persistReminderSubscription: () => Promise<void>;
} {
  const { subscriptionId, campaignId, enabled } = options;
  const isStoredRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  const compositeKey = useMemo(() => {
    if (!subscriptionId || !campaignId) {
      return null;
    }
    return buildCampaignReminderCompositeKey(subscriptionId, campaignId);
  }, [subscriptionId, campaignId]);

  useEffect(() => {
    if (!enabled) {
      setHydrated(true);
      return;
    }
    if (!compositeKey) {
      setHydrated(true);
      return;
    }
    const storageKey = reminderStorageKeyForComposite(compositeKey);
    const raw = StorageWrapper.getItemSync(storageKey);
    isStoredRef.current = raw === REMINDER_SUBSCRIBED_VALUE;
    setHydrated(true);
    setRenderKey((k) => k + 1);
  }, [enabled, compositeKey]);

  const showRemindMeCta = Boolean(
    renderKey >= 0 &&
      enabled &&
      hydrated &&
      compositeKey &&
      !isStoredRef.current,
  );

  const persistReminderSubscription = useCallback(async () => {
    if (!compositeKey) {
      throw new Error('Missing subscription or campaign for reminder storage');
    }
    if (isStoredRef.current) {
      return;
    }
    const storageKey = reminderStorageKeyForComposite(compositeKey);
    await StorageWrapper.setItem(storageKey, REMINDER_SUBSCRIBED_VALUE);
    isStoredRef.current = true;
    setRenderKey((k) => k + 1);
  }, [compositeKey]);

  return { showRemindMeCta, persistReminderSubscription };
}
