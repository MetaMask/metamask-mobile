import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import type { CampaignDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../locales/i18n';
import useRewardsToast from './useRewardsToast';
import { useCampaignReminderSubscription } from './useCampaignReminderSubscriptions';

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
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const { showRemindMeCta, persistReminderSubscription } =
    useCampaignReminderSubscription({
      subscriptionId,
      campaignId: campaign.id,
      enabled,
    });

  const handleRemindMePress = useCallback(async () => {
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

  return { showRemindMeCta, handleRemindMePress };
}
