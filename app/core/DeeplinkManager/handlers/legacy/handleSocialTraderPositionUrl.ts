import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import ReactQueryService from '../../../ReactQueryService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import {
  getFollowTradingHomeRoute,
  isSocialV1Treatment,
} from '../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { ensureSocialTermsAccepted } from '../../../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance';
import {
  parseSocialNotificationDeeplinkParams,
  trackSocialNotificationClick,
} from './socialNotificationDeeplink';

interface HandleSocialTraderPositionUrlParams {
  actionPath: string;
}

const navigateToFallback = () => {
  if (
    isSocialV1Treatment() &&
    !ensureSocialTermsAccepted(
      NavigationService.navigation.navigate,
      navigateToFallback,
    )
  ) {
    return;
  }
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
    } = parseSocialNotificationDeeplinkParams(actionPath);
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

    trackSocialNotificationClick({
      notificationSubtype,
      notificationTemplateVariant,
      deduplicationId,
    });

    const openedFromNotification = notificationSubtype !== undefined;

    const isV1Treatment = isSocialV1Treatment();
    // Catches on its own because the terms screen can run it after this
    // handler's try/catch has returned.
    const openPosition = () => {
      try {
        NavigationService.navigation.navigate(Routes.SOCIAL.POSITION, {
          positionId,
          traderId,
          source: openedFromNotification ? 'notification' : 'deep_link',
          originalEntryPoint: openedFromNotification
            ? 'notification'
            : 'deep_link',
          notificationSubtype,
          notificationTemplateVariant,
          isSocialV1: isV1Treatment,
        });
      } catch (error) {
        DevLogger.log(
          '[handleSocialTraderPositionUrl] Failed to open the position:',
          error,
        );
        navigateToFallback();
      }
    };
    if (
      isV1Treatment &&
      !ensureSocialTermsAccepted(
        NavigationService.navigation.navigate,
        openPosition,
      )
    ) {
      return;
    }
    openPosition();
  } catch (error) {
    DevLogger.log(
      '[handleSocialTraderPositionUrl] Failed to handle deeplink:',
      error,
    );
    navigateToFallback();
  }
};
