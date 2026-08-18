import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import type { CampaignDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../locales/i18n';
import useRewardsToast from './useRewardsToast';
import { useRewardsNotificationsNudge } from './useRewardsNotificationsNudge';
import { subscribeCampaignReminder } from '../../../../reducers/rewards';
import { selectSubscribedCampaignReminders } from '../../../../reducers/rewards/selectors';
import { buildSubscriptionCampaignCompositeKey } from '../../../../reducers/rewards/compositeKeys';

/** @deprecated Use {@link buildSubscriptionCampaignCompositeKey} instead. */
export const buildCampaignReminderCompositeKey =
  buildSubscriptionCampaignCompositeKey;

/**
 * Shared Redux state, analytics, and toasts for campaign start reminders
 * (tile icon CTA and preview "Notify me" CTA).
 */
export function useCampaignReminderActions(
  campaign: CampaignDto,
  enabled: boolean,
): {
  showRemindMeCta: boolean;
  handleRemindMePress: () => Promise<void>;
} {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const subscribedReminders =
    useSelector(selectSubscribedCampaignReminders) ?? {};
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
    return buildSubscriptionCampaignCompositeKey(subscriptionId, campaign.id);
  }, [subscriptionId, campaign.id]);

  const isSubscribed = compositeKey
    ? subscribedReminders[compositeKey] === true
    : false;

  const showRemindMeCta = Boolean(
    enabled &&
      canPromptToEnableNotifications &&
      compositeKey &&
      (!areNotificationsEnabled || !isSubscribed),
  );

  const subscribeToReminder = useCallback(() => {
    if (!subscriptionId || !campaign.id) {
      return;
    }
    if (isSubscribed) {
      return;
    }
    dispatch(
      subscribeCampaignReminder({
        subscriptionId,
        campaignId: campaign.id,
      }),
    );
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
    subscriptionId,
    campaign.id,
    campaign.startDate,
    isSubscribed,
    dispatch,
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
