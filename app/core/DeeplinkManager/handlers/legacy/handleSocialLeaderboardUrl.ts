import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { navigateToSocialLeaderboard } from '../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { trackSocialNotificationClicked } from './sharedNotificationAnalytics';

interface HandleSocialLeaderboardUrlParams {
  actionPath?: string;
}

const parseSocialLeaderboardNavigationParams = (actionPath: string) => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );

  return {
    notificationSubtype:
      urlParams.get('notification_subtype')?.trim() || undefined,
    notificationTemplateVariant:
      urlParams.get('notification_template_variant')?.trim() || undefined,
  };
};

/**
 * Handles top-traders (leaderboard) deeplinks, including the weekly
 * "leaderboard updated" notification.
 *
 * Supported URL formats:
 * - https://link.metamask.io/top-traders
 * - https://link.metamask.io/top-traders?notification_subtype=leaderboard_weekly_update&notification_template_variant=<variant>&deduplication_id=<id>
 *
 * Notification-sourced opens carry a `notification_subtype`; those are tagged
 * with an analytics event so open/CTR can be measured per copy variant.
 * Analytics never blocks navigation.
 */
export const handleSocialLeaderboardUrl = ({
  actionPath = '',
}: HandleSocialLeaderboardUrlParams = {}) => {
  try {
    trackSocialNotificationClicked(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_WEEKLY_NOTIFICATION_CLICKED,
      parseSocialLeaderboardNavigationParams(actionPath),
    );
  } catch (error) {
    DevLogger.log(
      '[handleSocialLeaderboardUrl] Failed to record notification analytics:',
      error,
    );
  }

  navigateToSocialLeaderboard(NavigationService.navigation.navigate);
};
