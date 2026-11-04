import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import Routes from '../../../../constants/navigation/Routes';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import NavigationService from '../../../NavigationService';
import ReactQueryService from '../../../ReactQueryService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { SocialLeaderboardEventProperties } from '../../../../components/Views/SocialLeaderboard/analytics/socialLeaderboardEvents';
import { navigateToSocialV1Profile } from '../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import { ensureSocialTermsAccepted } from '../../../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance';
import type { SocialV1FeedAuthor } from '../../../../components/UI/SocialFeed/types';
import { toWholePercent } from '../../../../components/UI/SocialFeed/utils/feedCardStats';
import { buildTraderProfileQueryKey } from '../../../../util/social/traderProfileQueries';

interface HandleSocialPostUrlParams {
  actionPath: string;
}

interface SocialPostNavigationParams {
  positionId?: string;
  traderId?: string;
  deduplicationId?: string;
  notificationSubtype?: string;
  notificationTemplateVariant?: string;
}

const parseSocialPostNavigationParams = (
  actionPath: string,
): SocialPostNavigationParams => {
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

/**
 * The recipient of this notification is the post's own author, so the
 * parameterless call lands them on their profile in owner chrome.
 */
const navigateToOwnProfile = () => {
  navigateToSocialV1Profile(NavigationService.navigation);
};

/**
 * The sheet reads `author.id` unconditionally, so a degraded author still
 * beats bouncing the creator away from the post the notification named.
 * Keeping the trader id as `id` preserves the sheet's own-post chrome.
 */
const resolveAuthor = async (traderId: string): Promise<SocialV1FeedAuthor> => {
  try {
    const { profile, stats, followerCount } =
      await ReactQueryService.queryClient.query<TraderProfileResponse>({
        queryKey: buildTraderProfileQueryKey(traderId),
      });

    return {
      id: profile.profileId,
      username: profile.name,
      address: profile.address,
      avatarUri: profile.imageUrl,
      winRatePercent: toWholePercent(stats.winRate30d),
      pnl30d: stats.pnl30d,
      tradeCount30d: stats.tradeCount30d,
      followerCount,
    };
  } catch (error) {
    DevLogger.log(
      '[handleSocialPostUrl] Failed to resolve the post author:',
      error,
    );
    return { id: traderId, username: '', winRatePercent: null };
  }
};

const openCopiedPost = async (
  positionId: string,
  traderId: string,
): Promise<void> => {
  let position: Position | undefined;

  try {
    position = await ReactQueryService.queryClient.query<Position>({
      queryKey: ['SocialService:fetchPositionById', { positionId }],
    });
  } catch (error) {
    DevLogger.log('[handleSocialPostUrl] Failed to fetch the position:', error);
  }

  // A hidden, removed or moderated post resolves to nothing.
  if (!position) {
    navigateToOwnProfile();
    return;
  }

  NavigationService.navigation.navigate(Routes.SOCIAL.POSITION_SHEET, {
    positionId,
    position,
    author: await resolveAuthor(traderId),
  });
};

/**
 * Opens the detail sheet of a copied post from a `your_trader_was_copied`
 * notification.
 *
 * Supported URL format:
 * - https://link.metamask.io/social-post?positionId=<positionId>&traderId=<traderId>&deduplication_id=<deduplicationId>&notification_subtype=<notificationSubtype>&notification_template_variant=<variant>
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
    } = parseSocialPostNavigationParams(actionPath);

    DevLogger.log('[handleSocialPostUrl] Parsed navigation parameters:', {
      positionId,
      traderId,
      deduplicationId,
      notificationSubtype,
      notificationTemplateVariant,
    });

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
