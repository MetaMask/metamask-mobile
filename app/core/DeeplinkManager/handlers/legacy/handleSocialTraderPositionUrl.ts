import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import ReactQueryService from '../../../ReactQueryService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import {
  getFollowTradingHomeRoute,
  isSocialV1Treatment,
  popToSocialTab,
} from '../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { ensureSocialTermsAccepted } from '../../../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance';
import { navigateToSocialV1Profile } from '../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import {
  parseSocialNotificationDeeplinkParams,
  trackSocialNotificationClick,
} from './socialNotificationDeeplink';
import {
  fetchSocialPosition,
  resolveSocialPositionAuthor,
} from './socialPositionSheetDeeplink';

const LOG_PREFIX = '[handleSocialTraderPositionUrl]';

interface HandleSocialTraderPositionUrlParams {
  actionPath: string;
}

const navigateToFallback = () => {
  if (isSocialV1Treatment()) {
    if (
      !ensureSocialTermsAccepted(
        NavigationService.navigation.navigate,
        navigateToFallback,
      )
    ) {
      return;
    }
    popToSocialTab(NavigationService.navigation);
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
 * A shared position opens like a profile row tap: the trader's Social V1
 * profile, with the position sheet over it. A position that can no longer be
 * fetched leaves the user on the profile.
 */
const openSharedPositionOnProfile = (
  positionId: string,
  traderId: string,
): void => {
  navigateToSocialV1Profile(NavigationService.navigation, {
    traderId,
    source: 'deep_link',
  });
  Promise.all([
    fetchSocialPosition(positionId, LOG_PREFIX),
    resolveSocialPositionAuthor(traderId, LOG_PREFIX),
  ])
    .then(([position, author]) => {
      if (!position) {
        return;
      }
      NavigationService.navigation.navigate(Routes.SOCIAL.POSITION_SHEET, {
        positionId,
        position,
        author,
        shareSource: 'deep_link',
      });
    })
    .catch((error: unknown) => {
      DevLogger.log(`${LOG_PREFIX} Failed to open the position sheet:`, error);
    });
};

/**
 * Handles TraderPosition deeplinks. On Social V1, a shared link opens the
 * position sheet on the trader's profile; a notification still opens the
 * position screen.
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
        if (isV1Treatment && !openedFromNotification) {
          openSharedPositionOnProfile(positionId, traderId);
          return;
        }
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
