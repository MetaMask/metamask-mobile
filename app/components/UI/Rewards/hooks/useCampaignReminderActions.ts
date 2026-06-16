import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import type { CampaignDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../locales/i18n';
import useRewardsToast from './useRewardsToast';
import { useRewardsNotificationsNudge } from './useRewardsNotificationsNudge';
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
 * Shared storage, analytics, and toasts for campaign start reminders
 * (tile icon CTA and preview "Notify me" CTA).
 */
export function useCampaignReminderActions(
  campaign: CampaignDto,
  enabled: boolean,
): {
  showRemindMeCta: boolean;
  handleRemindMePress: () => Promise<void>;
} {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isStoredRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const {
    canPromptToEnableNotifications,
    areNotificationsEnabled,
    runAfterNotificationsEnabled,
  } = useRewardsNotificationsNudge({ enabled });

  const compositeKey = useMemo(() => {
    if (!subscriptionId || !campaign.id) {
      return null;
    }
    return buildCampaignReminderCompositeKey(subscriptionId, campaign.id);
  }, [subscriptionId, campaign.id]);

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
      canPromptToEnableNotifications &&
      hydrated &&
      compositeKey &&
      (!areNotificationsEnabled || !isStoredRef.current),
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

  const subscribeToReminder = useCallback(async () => {
    try {
      await persistReminderSubscription();
    } catch {
      showToast(
        RewardsToastOptions.error(
          strings('rewards.campaign.remind_me_save_error'),
        ),
      );
      return;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_CAMPAIGN_REMINDER_SUBSCRIBED)
        .addProperties({
          campaign_id: campaign.id,
          campaign_starts_at: campaign.startDate,
        })
        .build(),
    );
    showToast(
      RewardsToastOptions.success(
        strings('rewards.campaign.remind_me_success_toast'),
      ),
    );
  }, [
    campaign.id,
    campaign.startDate,
    persistReminderSubscription,
    trackEvent,
    createEventBuilder,
    showToast,
    RewardsToastOptions,
  ]);

  const handleRemindMePress = useCallback(async () => {
    await runAfterNotificationsEnabled(subscribeToReminder);
  }, [runAfterNotificationsEnabled, subscribeToReminder]);

  return { showRemindMeCta, handleRemindMePress };
}
