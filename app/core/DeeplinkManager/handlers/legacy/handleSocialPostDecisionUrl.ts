import Routes from '../../../../constants/navigation/Routes';
import { navigateToSocialV1Profile } from '../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import {
  parseSocialNotificationDeeplinkParams,
  trackSocialNotificationClick,
} from './socialNotificationDeeplink';
import { parseSocialPostDecisionParams } from './socialPostDecisionDeeplink';

interface HandleSocialPostDecisionUrlParams {
  actionPath: string;
}

/**
 * Opens the moderation decision screen from a "Your post was removed",
 * "Your profile was hidden" or "Update on your report" notification.
 *
 * Supported URL format:
 * - https://link.metamask.io/social/post/decision?kind=<post-removed|profile-hidden|report-post-removed|report-post-left-up|report-profile-hidden|report-profile-left-up>&handle=<handle>&reason=<reason>[&text=<text>][&postedAt=<ms>][&avatarUrl=<url>][&profileId=<id>][&verified=true][&notification_subtype=<subtype>]
 *
 * `text` is required for every kind that is about a post. A link that
 * cannot describe the decision lands the recipient on their profile instead.
 */
export const handleSocialPostDecisionUrl = ({
  actionPath,
}: HandleSocialPostDecisionUrlParams) => {
  DevLogger.log(
    '[handleSocialPostDecisionUrl] Starting deeplink handling with path:',
    actionPath,
  );

  try {
    const {
      deduplicationId,
      notificationSubtype,
      notificationTemplateVariant,
    } = parseSocialNotificationDeeplinkParams(actionPath);
    trackSocialNotificationClick({
      notificationSubtype,
      notificationTemplateVariant,
      deduplicationId,
    });

    const decision = parseSocialPostDecisionParams(actionPath);
    if (!decision) {
      DevLogger.log(
        '[handleSocialPostDecisionUrl] Unknown kind or missing handle, text or reason, falling back to the profile',
      );
      navigateToSocialV1Profile(NavigationService.navigation);
      return;
    }

    NavigationService.navigation.navigate(
      Routes.SOCIAL.POST_DECISION,
      decision,
    );
  } catch (error) {
    DevLogger.log(
      '[handleSocialPostDecisionUrl] Failed to handle deeplink:',
      error,
    );
    navigateToSocialV1Profile(NavigationService.navigation);
  }
};
