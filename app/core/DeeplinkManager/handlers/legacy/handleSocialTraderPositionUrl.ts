import Routes from '../../../../constants/navigation/Routes';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import NavigationService from '../../../NavigationService';
import ReactQueryService from '../../../ReactQueryService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { SocialLeaderboardEventProperties } from '../../../../components/Views/SocialLeaderboard/analytics/socialLeaderboardEvents';

interface HandleSocialTraderPositionUrlParams {
  actionPath: string;
}

interface SocialTraderPositionNavigationParams {
  positionId?: string;
  traderId?: string;
  deduplicationId?: string;
  notificationEvent?: string;
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
    notificationEvent: urlParams.get('notification_event')?.trim() || undefined,
  };
};

const navigateToFallback = () => {
  NavigationService.navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW);
};

/**
 * Handles notification-approved TraderPosition deeplinks.
 *
 * Supported URL format:
 * - https://link.metamask.io/social-trader-position?positionId=<positionId>&traderId=<traderId>&deduplication_id=<deduplicationId>&notification_event=<notificationEvent>
 */
export const handleSocialTraderPositionUrl = ({
  actionPath,
}: HandleSocialTraderPositionUrlParams) => {
  DevLogger.log(
    '[handleSocialTraderPositionUrl] Starting deeplink handling with path:',
    actionPath,
  );

  try {
    const { positionId, traderId, deduplicationId, notificationEvent } =
      parseSocialTraderPositionNavigationParams(actionPath);
    DevLogger.log(
      '[handleSocialTraderPositionUrl] Parsed navigation parameters:',
      { positionId, traderId, deduplicationId, notificationEvent },
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

    if (notificationEvent !== undefined) {
      const event = AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_NOTIFICATION_CLICKED,
      )
        .addProperties({
          [SocialLeaderboardEventProperties.NOTIFICATION_TYPE]:
            notificationEvent,
        })
        .build();
      analytics.trackEvent(event);
    }

    NavigationService.navigation.navigate(Routes.SOCIAL_LEADERBOARD.POSITION, {
      positionId,
      traderId,
      source: 'notification',
    });
  } catch (error) {
    DevLogger.log(
      '[handleSocialTraderPositionUrl] Failed to handle deeplink:',
      error,
    );
    navigateToFallback();
  }
};
