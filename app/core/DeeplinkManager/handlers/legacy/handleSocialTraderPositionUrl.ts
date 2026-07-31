import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import NavigationService from '../../../NavigationService';
import ReactQueryService from '../../../ReactQueryService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { trackSocialNotificationClicked } from './sharedNotificationAnalytics';

interface HandleSocialTraderPositionUrlParams {
  actionPath: string;
}

interface SocialTraderPositionNavigationParams {
  positionId?: string;
  traderId?: string;
  deduplicationId?: string;
  notificationSubtype?: string;
  notificationTemplateVariant?: string;
}

const parseSocialTraderPositionNavigationParams = (
  actionPath: string,
): SocialTraderPositionNavigationParams => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );

  return {
    positionId: urlParams.get('positionId')?.trim() || undefined,
    traderId: urlParams.get('traderId')?.trim() || undefined,
    deduplicationId: urlParams.get('deduplication_id')?.trim() || undefined,
    notificationSubtype:
      urlParams.get('notification_subtype')?.trim() || undefined,
    notificationTemplateVariant:
      urlParams.get('notification_template_variant')?.trim() || undefined,
  };
};

const navigateToFallback = () => {
  NavigationService.navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW);
};

/**
 * Handles notification-approved TraderPosition deeplinks.
 *
 * Supported URL format:
 * - https://link.metamask.io/social-trader-position?positionId=<positionId>&traderId=<traderId>&deduplication_id=<deduplicationId>&notification_subtype=<notificationSubtype>&notification_template_variant=<variant>
 */
export const handleSocialTraderPositionUrl = ({
  actionPath,
}: HandleSocialTraderPositionUrlParams) => {
  DevLogger.log(
    '[handleSocialTraderPositionUrl] Starting deeplink handling with path:',
    actionPath,
  );

  try {
    const {
      positionId,
      traderId,
      deduplicationId,
      notificationSubtype,
      notificationTemplateVariant,
    } = parseSocialTraderPositionNavigationParams(actionPath);
    DevLogger.log(
      '[handleSocialTraderPositionUrl] Parsed navigation parameters:',
      {
        positionId,
        traderId,
        deduplicationId,
        notificationSubtype,
        notificationTemplateVariant,
      },
    );

    if (!positionId || !traderId) {
      DevLogger.log(
        '[handleSocialTraderPositionUrl] Missing positionId or traderId, falling back to social leaderboard',
      );
      navigateToFallback();
      return;
    }

    // Defense-in-depth: invalidate cached positions for this trader so the
    // profile view fetches fresh data the next time it mounts. Failures
    // here must not block navigation.
    try {
      const fetchOptions = { addressOrId: traderId };
      ReactQueryService.queryClient.invalidateQueries({
        queryKey: ['SocialService:fetchOpenPositions', fetchOptions],
      });
      ReactQueryService.queryClient.invalidateQueries({
        queryKey: ['SocialService:fetchClosedPositions', fetchOptions],
      });
    } catch (invalidationError) {
      DevLogger.log(
        '[handleSocialTraderPositionUrl] Failed to invalidate position queries:',
        invalidationError,
      );
    }

    trackSocialNotificationClicked(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_NOTIFICATION_CLICKED,
      { notificationSubtype, notificationTemplateVariant },
    );

    NavigationService.navigation.navigate(Routes.SOCIAL_LEADERBOARD.POSITION, {
      positionId,
      traderId,
      source: 'notification',
      originalEntryPoint: 'notification',
      notificationSubtype,
      notificationTemplateVariant,
    });
  } catch (error) {
    DevLogger.log(
      '[handleSocialTraderPositionUrl] Failed to handle deeplink:',
      error,
    );
    navigateToFallback();
  }
};
