import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { navigateToSocialV1Profile } from '../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import { ensureSocialTermsAccepted } from '../../../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance';
import {
  parseSocialNotificationDeeplinkParams,
  trackSocialNotificationClick,
} from './socialNotificationDeeplink';
import {
  fetchSocialPosition,
  resolveSocialPositionAuthor,
} from './socialPositionSheetDeeplink';

const LOG_PREFIX = '[handleSocialPostUrl]';

interface HandleSocialPostUrlParams {
  actionPath: string;
}

/**
 * The recipient of this notification is the post's own author, so the
 * parameterless call lands them on their profile in owner chrome.
 */
const navigateToOwnProfile = () => {
  navigateToSocialV1Profile(NavigationService.navigation);
};

const openCopiedPost = async (
  positionId: string,
  traderId: string,
): Promise<void> => {
  const position = await fetchSocialPosition(positionId, LOG_PREFIX);

  if (!position) {
    navigateToOwnProfile();
    return;
  }

  NavigationService.navigation.navigate(Routes.SOCIAL.POSITION_SHEET, {
    positionId,
    position,
    author: await resolveSocialPositionAuthor(traderId, LOG_PREFIX),
  });
};

/**
 * Opens the detail sheet of a copied post from a `your_trader_was_copied`
 * notification.
 *
 * Supported URL format:
 * - https://link.metamask.io/social/post?positionId=<positionId>&traderId=<traderId>&deduplication_id=<deduplicationId>&notification_subtype=<notificationSubtype>&notification_template_variant=<variant>
 */
export const handleSocialPostUrl = ({
  actionPath,
}: HandleSocialPostUrlParams) => {
  DevLogger.log(
    '[handleSocialPostUrl] Starting deeplink handling with path:',
    actionPath,
  );

  try {
    const {
      positionId,
      traderId,
      deduplicationId,
      notificationSubtype,
      notificationTemplateVariant,
    } = parseSocialNotificationDeeplinkParams(actionPath);

    DevLogger.log('[handleSocialPostUrl] Parsed navigation parameters:', {
      positionId,
      traderId,
      deduplicationId,
      notificationSubtype,
      notificationTemplateVariant,
    });

    trackSocialNotificationClick({
      notificationSubtype,
      notificationTemplateVariant,
      deduplicationId,
    });

    if (!ensureSocialTermsAccepted(NavigationService.navigation.navigate)) {
      return;
    }

    if (!positionId || !traderId) {
      DevLogger.log(
        '[handleSocialPostUrl] Missing positionId or traderId, falling back to the profile',
      );
      navigateToOwnProfile();
      return;
    }

    openCopiedPost(positionId, traderId).catch((error) => {
      DevLogger.log('[handleSocialPostUrl] Failed to open the post:', error);
      navigateToOwnProfile();
    });
  } catch (error) {
    DevLogger.log('[handleSocialPostUrl] Failed to handle deeplink:', error);
    navigateToOwnProfile();
  }
};
