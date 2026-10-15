import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useImperativeHandle, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type { TopTrader } from '../../../Views/Homepage/Sections/TopTraders/types';
import {
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
} from '../../../Views/SocialLeaderboard/analytics';
import { useFollowWithNotificationSetup } from '../../../Views/SocialLeaderboard/hooks/useFollowWithNotificationSetup';
import { navigateToSocialV1Profile } from '../../../Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import { matchesShellTraderCohort } from '../../../Views/SocialLeaderboard/shell/filters/matchShellFilters';
import {
  SOCIAL_V1_TRADER_ROW_HEIGHT,
  SocialV1TraderRow,
  SocialV1TraderRowSkeleton,
} from '../../../Views/SocialLeaderboard/TopTradersView/components';
import { useLeaderboardReveal } from '../../../Views/SocialLeaderboard/TopTradersView/components/useLeaderboardReveal';
import { RANK_CHANGE_DURATION } from '../../../Views/SocialLeaderboard/TopTradersView/components/useRankChangeAnimation';
import { getTraderMetricDisplay } from '../../../Views/SocialLeaderboard/TopTradersView/traderMetric';
import {
  SocialFeedSurfaceProvider,
  type SocialSurfaceLocation,
} from '../../SocialFeed/SocialFeedSurface';
import {
  LEADERBOARD_FETCH_LIMIT,
  useSocialLeaderboard,
} from '../data/useSocialLeaderboard';
import {
  getLeaderboardAssetClass,
  type SocialLeaderboardSource,
} from '../data/socialLeaderboardSource';
import { useLeaderboardViewerRow } from '../hooks/useLeaderboardViewerRow';
import {
  DEFAULT_SOCIAL_LEADERBOARD_FILTERS,
  toLeaderboardSort,
  type RankedTrader,
  type SocialLeaderboardFilters,
} from '../types';
import SocialLeaderboardMessage from './SocialLeaderboardMessage';
import { SocialLeaderboardSelectorsIDs } from './SocialLeaderboard.testIds';

/**
 * Slide a row runs when the ranking reshuffles, matched to the row's own
 * rank-change pulse so both resolve together.
 */
const rowLayoutTransition = LinearTransition.duration(
  RANK_CHANGE_DURATION,
).easing(Easing.out(Easing.ease));

/** Extra placeholders past the fold so the shimmer continues while scrolling. */
const SKELETON_OVERSCAN = 2;

/** Lets a host that owns the scroll view drive pull-to-refresh. */
export interface SocialLeaderboardHandle {
  refresh: () => Promise<void>;
}

export interface SocialLeaderboardProps {
  /** Which ranking to load. The component fetches it; the host does not. */
  source: SocialLeaderboardSource;
  /** Where this leaderboard is shown. */
  location: SocialSurfaceLocation;
  /** Optional heading above the rows. */
  title?: string;
  /** Rows to show. Defaults to the full fetched page. */
  limit?: number;
  /** Ranking options. The host renders any filter UI. */
  filters?: SocialLeaderboardFilters;
  /** Pins the signed-in viewer's card above the rows. */
  showViewerRow?: boolean;
  ref?: React.Ref<SocialLeaderboardHandle>;
}

/**
 * Ranked trader list for one source. Renders inside the host's scroll:
 * skeleton, rows, or an empty, unavailable or error message. Rows slide to
 * their new position when the ranking changes, and the first paint replays
 * the order the user last saw.
 */
const SocialLeaderboard: React.FC<SocialLeaderboardProps> = ({
  source,
  location,
  title,
  limit = LEADERBOARD_FETCH_LIMIT,
  filters = DEFAULT_SOCIAL_LEADERBOARD_FILTERS,
  showViewerRow = false,
  ref,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { height: windowHeight } = useWindowDimensions();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);
  const { track } = useSocialLeaderboardAnalytics();
  const { followWithSetup } = useFollowWithNotificationSetup();
  const networkTier = useNetworkTier();
  // Low-RAM devices skip the reveal and the reorder slide.
  const canAnimate = getHardwareTier() !== 'LOW';
  const isOffline = networkTier === 'NONE';

  const { timeframe, ranking, cohort } = filters;
  const sort = toLeaderboardSort(ranking);
  const assetClass = getLeaderboardAssetClass(source);

  const {
    traders: freshTraders,
    isLoading,
    hasFetched,
    error,
    refresh,
    toggleFollow,
    resolution,
  } = useSocialLeaderboard(source, {
    timeframe,
    sort,
    enabled: !isOffline,
  });

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const hydrateSnapshotRow = useCallback(
    (trader: TopTrader): RankedTrader => ({
      ...trader,
      displayMetric: getTraderMetricDisplay(trader, sort),
    }),
    [sort],
  );
  const snapshotKeyParts = useMemo(
    () => ({ type: assetClass, sort, timeframe }),
    [assetClass, sort, timeframe],
  );
  const { rows: traders, isShowingSnapshot } = useLeaderboardReveal({
    freshTraders,
    hasFetched,
    keyParts: snapshotKeyParts,
    enabled: canAnimate && resolution.status === 'ready',
    hydrateRow: hydrateSnapshotRow,
  });

  const { viewerRow, rowsWithoutViewer, viewerProfileId, viewerAddress } =
    useLeaderboardViewerRow(
      traders,
      sort,
      showViewerRow && resolution.status === 'ready',
    );

  const rows = useMemo(
    () =>
      rowsWithoutViewer
        .filter((trader) =>
          matchesShellTraderCohort({
            traderCohort: cohort,
            pnl30d: trader.pnl30d,
            isFollowing: trader.isFollowing,
          }),
        )
        .slice(0, limit),
    [cohort, limit, rowsWithoutViewer],
  );

  const skeletonKeys = useMemo(() => {
    const visible = Math.ceil(windowHeight / SOCIAL_V1_TRADER_ROW_HEIGHT);
    const count = Math.min(limit, visible + SKELETON_OVERSCAN);
    return Array.from({ length: count }, (_, i) => `leaderboard-skeleton-${i}`);
  }, [limit, windowHeight]);

  const handleFollowPress = useCallback(
    async (traderId: string) => {
      const trader = traders.find((t) => t.id === traderId);
      await followWithSetup(trader?.isFollowing ?? false, () =>
        toggleFollow(traderId, {
          source: 'leaderboard',
          traderAddress: trader?.address ?? '',
          traderUsername: trader?.username,
          traderRank: trader?.rank,
          traderAvatarUri: trader?.avatarUri,
        }),
      );
    },
    [followWithSetup, toggleFollow, traders],
  );

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      const trader = traders.find((t) => t.id === traderId);
      if (trader) {
        track(MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_TRADER_CLICKED, {
          [SocialLeaderboardEventProperties.TRADER_ADDRESS]: trader.address,
          [SocialLeaderboardEventProperties.TRADER_USERNAME]: trader.username,
          [SocialLeaderboardEventProperties.TRADER_RANK]: trader.rank,
          [SocialLeaderboardEventProperties.CHAIN_FILTER]: assetClass,
        });
      }
      navigateToSocialV1Profile(navigation, {
        traderId,
        traderName,
        traderAddress: trader?.address,
        traderAvatarUri: trader?.avatarUri,
        source: 'leaderboard',
        traderRank: trader?.rank,
        viewerProfileId,
        viewerAddress,
      });
    },
    [assetClass, navigation, track, traders, viewerAddress, viewerProfileId],
  );

  const handleViewerPress = useCallback(() => {
    navigateToSocialV1Profile(navigation, { viewerProfileId, viewerAddress });
  }, [navigation, viewerAddress, viewerProfileId]);

  const handleRetry = useCallback(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  if (!isEnabled || resolution.status === 'hidden') {
    return null;
  }

  const renderBody = () => {
    if (resolution.status === 'unavailable') {
      return (
        <SocialLeaderboardMessage
          message={strings('social_leaderboard.feed.no_data')}
          testID={SocialLeaderboardSelectorsIDs.UNAVAILABLE}
        />
      );
    }
    if (isLoading && traders.length === 0 && !isShowingSnapshot) {
      return (
        <Box testID={SocialLeaderboardSelectorsIDs.SKELETON}>
          {skeletonKeys.map((key) => (
            <SocialV1TraderRowSkeleton key={key} />
          ))}
        </Box>
      );
    }
    if (rows.length > 0) {
      return (
        <Box testID={SocialLeaderboardSelectorsIDs.ROWS}>
          {rows.map((trader) => (
            // Stable keys let a reorder read as movement: the view for a
            // trader survives the sort, so there is an old offset to slide from.
            <Animated.View
              key={trader.id}
              layout={canAnimate ? rowLayoutTransition : undefined}
            >
              <SocialV1TraderRow
                trader={trader}
                metric={trader.displayMetric}
                onFollowPress={handleFollowPress}
                onTraderPress={handleTraderPress}
              />
            </Animated.View>
          ))}
        </Box>
      );
    }
    if (error || (isOffline && !hasFetched)) {
      return (
        <SocialLeaderboardMessage
          message={strings('perps.errors.unknown.title')}
          testID={SocialLeaderboardSelectorsIDs.ERROR}
          onRetry={isOffline ? undefined : handleRetry}
        />
      );
    }
    if (hasFetched) {
      return (
        <SocialLeaderboardMessage
          message={strings('social_leaderboard.profiles_to_follow.empty')}
          testID={SocialLeaderboardSelectorsIDs.EMPTY}
        />
      );
    }
    return null;
  };

  return (
    <SocialFeedSurfaceProvider location={location}>
      <Box twClassName="gap-2" testID={SocialLeaderboardSelectorsIDs.CONTAINER}>
        {title ? (
          <Text variant={TextVariant.HeadingSm} twClassName="px-4">
            {title}
          </Text>
        ) : null}
        {viewerRow ? (
          <SocialV1TraderRow
            trader={viewerRow.trader}
            metric={viewerRow.trader.displayMetric}
            onFollowPress={handleFollowPress}
            onTraderPress={handleViewerPress}
            highlighted
            hideRank={viewerRow.hideRank}
            testID={SocialLeaderboardSelectorsIDs.VIEWER_CARD}
          />
        ) : null}
        {renderBody()}
      </Box>
    </SocialFeedSurfaceProvider>
  );
};

export default SocialLeaderboard;
