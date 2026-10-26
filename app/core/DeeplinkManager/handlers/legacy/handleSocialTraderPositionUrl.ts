import Routes from '../../../../constants/navigation/Routes';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import NavigationService from '../../../NavigationService';
import ReactQueryService from '../../../ReactQueryService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { SocialLeaderboardEventProperties } from '../../../../components/Views/SocialLeaderboard/analytics/socialLeaderboardEvents';
import {
  getFollowTradingHomeRoute,
  isSocialV1Treatment,
} from '../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';

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
  NavigationService.navigation.navigate(
    getFollowTradingHomeRoute(),
    undefined,
    { pop: true },
  );
};

const logPositionQueryInvalidationError = (invalidationError: unknown) => {
  DevLogger.log(
    '[handleSocialTraderPositionUrl] Failed to invalidate position queries:',
    invalidationError,
  );
};

/**
 * Handles notification-approved TraderPosition deeplinks.
 *
 * Supported URL formats:
 * - https://link.metamask.io/social/profile/position?positionId=<positionId>&traderId=<traderId>&deduplication_id=<deduplicationId>&notification_subtype=<notificationSubtype>&notification_template_variant=<variant>
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
    // profile view fetches fresh data the next time it mounts. Rejections
    // are logged and do not block navigation.
    const fetchOptions = { addressOrId: traderId };
    void ReactQueryService.queryClient
      .invalidateQueries({
        queryKey: ['SocialService:fetchOpenPositions', fetchOptions],
      })
      .catch(logPositionQueryInvalidationError);
    void ReactQueryService.queryClient
      .invalidateQueries({
        queryKey: ['SocialService:fetchClosedPositions', fetchOptions],
      })
      .catch(logPositionQueryInvalidationError);

    if (notificationSubtype !== undefined) {
      const event = AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_NOTIFICATION_CLICKED,
      )
        .addProperties({
          [SocialLeaderboardEventProperties.NOTIFICATION_SUBTYPE]:
            notificationSubtype,
          ...(notificationTemplateVariant !== undefined && {
            [SocialLeaderboardEventProperties.NOTIFICATION_TEMPLATE_VARIANT]:
              notificationTemplateVariant,
          }),
        })
        .build();
      analytics.trackEvent(event);
    }

    const openedFromNotification = notificationSubtype !== undefined;

    NavigationService.navigation.navigate(Routes.SOCIAL.POSITION, {
      positionId,
      traderId,
      source: openedFromNotification ? 'notification' : 'deep_link',
      originalEntryPoint: openedFromNotification ? 'notification' : 'deep_link',
      notificationSubtype,
      notificationTemplateVariant,
      isSocialV1: isSocialV1Treatment(),
    });
  } catch (error) {
    DevLogger.log(
      '[handleSocialTraderPositionUrl] Failed to handle deeplink:',
      error,
    );
    navigateToFallback();
  }
};
