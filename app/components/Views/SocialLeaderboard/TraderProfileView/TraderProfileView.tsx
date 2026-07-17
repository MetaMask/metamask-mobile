/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  FontWeight,
  HeaderStandardAnimated,
  Text,
  TextColor,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../util/haptics';
import {
  buildFollowTradingTokenContext,
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
  type TraderProfileScreenViewedSource,
} from '../analytics';

import { selectSocialLeaderboardPerpsEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import ErrorState from '../../Homepage/components/ErrorState/ErrorState';
import TraderHeaderIdentity from '../components/TraderHeaderIdentity';
import TraderMuteChip from '../components/TraderMuteChip';
import { useOpenTradingSignalsSetup } from '../hooks/useOpenTradingSignalsSetup';
import { useTraderMute } from '../hooks/useTraderMute';
import { HYPERLIQUID_CHAIN_NAME, isPerpPosition } from '../utils/perp';
import { TraderProfileViewSelectorsIDs } from './TraderProfileView.testIds';
import PositionRow from './components/PositionRow';
import ProfileHeader from './components/ProfileHeader';
import {
  PositionRowSkeleton,
  ProfileHeaderSkeleton,
  StatsRowSkeleton,
} from './components/Skeletons';
import SortButton from './components/SortButton';
import StatsRow from './components/StatsRow';
import TraderProfileCompactStats from './components/TraderProfileCompactStats';
import { useTraderPositions, useTraderProfile } from './hooks';
import { resolveQuickBuyOriginalEntryPointFromProfile } from '../TraderPositionView/components/QuickBuy/analytics';
import {
  CLOSED_SORT_CYCLE,
  OPEN_SORT_CYCLE,
  sortPositions,
  type ClosedSortKey,
  type OpenSortKey,
  type SortKey,
} from './utils/sortPositions';

const POSITION_SKELETON_COUNT = 4;
const POSITION_SKELETON_KEYS = Array.from(
  { length: POSITION_SKELETON_COUNT },
  (_, i) => `position-skeleton-${i}`,
);

const OPEN_SORT_LABEL_KEYS: Record<OpenSortKey, string> = {
  value: 'social_leaderboard.trader_profile.sort.value',
  pnl: 'social_leaderboard.trader_profile.sort.pnl_percent',
  recent: 'social_leaderboard.trader_profile.sort.recent',
};

const CLOSED_SORT_LABEL_KEYS: Record<ClosedSortKey, string> = {
  value: 'social_leaderboard.trader_profile.sort.top_trades',
  pnl: 'social_leaderboard.trader_profile.sort.pnl_percent',
  recent: 'social_leaderboard.trader_profile.sort.recent',
};

const getPositionListKey = (position: Position): string =>
  position.positionId ?? `${position.tokenAddress}-${position.chain}`;

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
}

const TabButton: React.FC<TabButtonProps> = ({
  label,
  isActive,
  onPress,
  testID,
}) => (
  <TouchableOpacity onPress={onPress} testID={testID}>
    <Box twClassName={`pb-2 ${isActive ? 'border-b-2 border-default' : ''}`}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={isActive ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
  </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const TraderProfileView = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TraderProfileView'>>();
  const tw = useTailwind();
  const {
    traderId,
    traderName,
    traderAddress: traderAddressParam,
    source: sourceParam,
    traderRank,
  } = route.params;
  const source = (sourceParam ??
    'deep_link') as TraderProfileScreenViewedSource;
  const { track } = useSocialLeaderboardAnalytics();
  const isPerpsEnabled = useSelector(selectSocialLeaderboardPerpsEnabled);

  const {
    profile,
    isLoading,
    error: profileError,
    isFollowing,
    toggleFollow,
    refresh,
  } = useTraderProfile(traderId, { refetchInterval: 30_000 });
  const {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    refetch: refetchPositions,
  } = useTraderPositions(traderId, { refetchInterval: 30_000 });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const traderAddress = traderAddressParam ?? profile?.profile.address ?? '';

  // The headline 7D return reflects the trader's PnL across every enabled
  // asset class they traded. When perps are enabled this includes Hyperliquid.
  // Summing the per-chain 7D breakdown is preferred over the global stats.pnl7d;
  // fall back to the global value only when no per-chain breakdown is available
  // (e.g. an older social-api that doesn't return perChainPnl7d).
  const headlineStats = useMemo(() => {
    if (!profile) return null;
    const perChainPnl7d = profile.perChainBreakdown?.perChainPnl7d;
    if (!perChainPnl7d || Object.keys(perChainPnl7d).length === 0) {
      return profile.stats;
    }
    const pnl7d = Object.entries(perChainPnl7d).reduce(
      (sum, [chain, value]) =>
        !isPerpsEnabled && chain.toLowerCase() === HYPERLIQUID_CHAIN_NAME
          ? sum
          : sum + (value ?? 0),
      0,
    );
    return { ...profile.stats, pnl7d };
  }, [profile, isPerpsEnabled]);
  // Fire Trader Profile Screen Viewed once profile resolves so we have an
  // accurate trader_address / is_following at the point the user lands.
  const hasFiredScreenViewedRef = useRef(false);
  useEffect(() => {
    if (hasFiredScreenViewedRef.current) return;
    if (!profile) return;
    hasFiredScreenViewedRef.current = true;
    track(MetaMetricsEvents.SOCIAL_TRADER_PROFILE_SCREEN_VIEWED, {
      [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
        traderAddress || profile.profile.address,
      [SocialLeaderboardEventProperties.TRADER_USERNAME]: profile.profile.name,
      [SocialLeaderboardEventProperties.SOURCE]: source,
      [SocialLeaderboardEventProperties.IS_FOLLOWING]: isFollowing,
      [SocialLeaderboardEventProperties.TRADER_RANK]: traderRank,
    });
  }, [profile, traderAddress, source, isFollowing, traderRank, track]);

  const { isChipMuted, isMuted, showMuteChip, toggleMute } =
    useTraderMute(traderId);
  const { openSetupIfNeeded } = useOpenTradingSignalsSetup();

  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [openSort, setOpenSort] = useState<OpenSortKey>('value');
  const [closedSort, setClosedSort] = useState<ClosedSortKey>('value');

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    playImpact(ImpactMoment.PullToRefresh);
    try {
      // Both hooks rethrow after logging; allSettled keeps one failure from
      // taking down the other refetch and prevents an unhandled rejection
      // from surfacing in the UI.
      await Promise.allSettled([refresh(), refetchPositions()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh, refetchPositions]);

  const handleFollowPress = useCallback(async () => {
    const wasFollowing = isFollowing;
    const performFollow = () =>
      toggleFollow({
        source: 'trader_profile',
        traderAddress: traderAddress || profile?.profile.address || '',
        traderUsername: profile?.profile.name,
        traderAvatarUri: profile?.profile.imageUrl,
        // Rank only meaningful when arriving from a ranked surface; omit on
        // trader_profile to keep schema clean.
      });
    if (!wasFollowing && openSetupIfNeeded(performFollow)) {
      return;
    }
    await performFollow();
  }, [toggleFollow, traderAddress, profile, isFollowing, openSetupIfNeeded]);

  const handleMutePress = useCallback(() => {
    // Tapping a bell that only looks disabled because notifications are off
    // means "enable"; forward an idempotent unmute rather than a toggle.
    const ensureUnmuted = () => {
      if (isMuted) {
        // Symmetric with the Follow button: same Light impact on any real toggle.
        playImpact(ImpactMoment.FollowToggle);
        toggleMute();
      }
    };
    if (openSetupIfNeeded(ensureUnmuted)) {
      return;
    }
    playImpact(ImpactMoment.FollowToggle);
    toggleMute();
  }, [openSetupIfNeeded, toggleMute, isMuted]);

  const handleTabChange = useCallback(
    (tab: 'open' | 'closed') => {
      if (activeTab === tab) return;
      setActiveTab(tab);
      if (traderAddress) {
        queueMicrotask(() => {
          track(MetaMetricsEvents.SOCIAL_TRADER_PROFILE_TAB_CHANGED, {
            [SocialLeaderboardEventProperties.TRADER_ADDRESS]: traderAddress,
            [SocialLeaderboardEventProperties.TAB]: tab,
          });
        });
      }
    },
    [activeTab, traderAddress, track],
  );

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const handlePositionPress = useCallback(
    (position: Position) => {
      const isOpenTab = activeTabRef.current === 'open';
      const context = buildFollowTradingTokenContext(position, traderAddress);
      if (context) {
        track(MetaMetricsEvents.SOCIAL_TRADER_PROFILE_POSITION_CLICKED, {
          ...context,
          [SocialLeaderboardEventProperties.IS_OPEN]: isOpenTab,
        });
      }
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.POSITION, {
        traderId,
        traderName,
        traderImageUrl: profile?.profile.imageUrl ?? undefined,
        traderAddress: traderAddress || undefined,
        tokenSymbol: position.tokenSymbol,
        position,
        source: 'profile_position',
        originalEntryPoint:
          resolveQuickBuyOriginalEntryPointFromProfile(source),
        isClosed: !isOpenTab,
      });
    },
    [
      navigation,
      traderId,
      traderName,
      profile?.profile.imageUrl,
      traderAddress,
      source,
      track,
    ],
  );
  const tabPositions = activeTab === 'open' ? openPositions : closedPositions;
  const positions = useMemo(
    () =>
      isPerpsEnabled
        ? tabPositions
        : tabPositions.filter((position) => !isPerpPosition(position)),
    [isPerpsEnabled, tabPositions],
  );
  const isLoadingPositions =
    activeTab === 'open' ? isLoadingOpen : isLoadingClosed;

  const currentSortKey: SortKey = activeTab === 'open' ? openSort : closedSort;
  const sortedPositions = useMemo(
    () => sortPositions(positions, currentSortKey, activeTab),
    [positions, currentSortKey, activeTab],
  );

  const handleSortPress = useCallback(() => {
    // Fire-and-forget haptic; ignore rejection (unsupported platforms).
    playSelection().catch(() => undefined);
    if (activeTab === 'open') {
      setOpenSort((current) => {
        const idx = OPEN_SORT_CYCLE.indexOf(current);
        return OPEN_SORT_CYCLE[(idx + 1) % OPEN_SORT_CYCLE.length];
      });
    } else {
      setClosedSort((current) => {
        const idx = CLOSED_SORT_CYCLE.indexOf(current);
        return CLOSED_SORT_CYCLE[(idx + 1) % CLOSED_SORT_CYCLE.length];
      });
    }
  }, [activeTab]);

  const {
    scrollY: scrollYShared,
    onScroll,
    setTitleSectionHeight,
    titleSectionHeightSv,
  } = useHeaderStandardAnimated();

  const headerTitle = profile?.profile.name;

  return (
    <SafeAreaView
      edges={['top']}
      style={tw.style('flex-1 bg-default')}
      testID={TraderProfileViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandardAnimated
        scrollY={scrollYShared}
        titleSectionHeight={titleSectionHeightSv}
        title={
          headerTitle && profile ? (
            <TraderHeaderIdentity
              traderName={headerTitle}
              traderImageUrl={profile.profile.imageUrl}
              traderAddress={profile.profile.address}
              variant="compact"
              testID={TraderProfileViewSelectorsIDs.HEADER_COMPACT_IDENTITY}
            />
          ) : undefined
        }
        subtitle={
          headlineStats ? (
            <TraderProfileCompactStats stats={headlineStats} />
          ) : undefined
        }
        onBack={handleBack}
        backButtonProps={{
          testID: TraderProfileViewSelectorsIDs.BACK_BUTTON,
        }}
        testID={TraderProfileViewSelectorsIDs.HEADER}
      />

      <Box twClassName="flex-1">
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-6')}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              testID={TraderProfileViewSelectorsIDs.REFRESH_CONTROL}
            />
          }
        >
          {!isLoading && profileError && !profile ? (
            <Box testID={TraderProfileViewSelectorsIDs.ERROR_BANNER}>
              <ErrorState
                title={strings(
                  'social_leaderboard.trader_profile.error_loading_profile',
                )}
                onRetry={refresh}
              />
            </Box>
          ) : (
            <>
              <Box
                testID={TraderProfileViewSelectorsIDs.TITLE_SECTION_WRAPPER}
                onLayout={(e) =>
                  setTitleSectionHeight(e.nativeEvent.layout.height)
                }
              >
                {isLoading && !profile ? (
                  <>
                    <ProfileHeaderSkeleton />
                    <StatsRowSkeleton />
                  </>
                ) : profile ? (
                  <>
                    <ProfileHeader
                      profile={profile.profile}
                      twitterHandle={profile.socialHandles?.twitter}
                    />
                    {headlineStats ? (
                      <StatsRow
                        stats={headlineStats}
                        holdTimeMinutes={profile.stats.medianHoldMinutes}
                      />
                    ) : (
                      <StatsRowSkeleton />
                    )}
                  </>
                ) : null}
              </Box>

              {profile && (
                <>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="px-4 pt-3 pb-1"
                  >
                    <Box twClassName="flex-1">
                      <Button
                        variant={
                          isFollowing
                            ? ButtonVariant.Secondary
                            : ButtonVariant.Primary
                        }
                        isFullWidth
                        onPress={handleFollowPress}
                        testID={TraderProfileViewSelectorsIDs.FOLLOW_BUTTON}
                      >
                        {isFollowing
                          ? strings('social_leaderboard.following')
                          : strings('social_leaderboard.follow')}
                      </Button>
                    </Box>
                    {showMuteChip && (
                      <TraderMuteChip
                        isMuted={isChipMuted}
                        visible={isFollowing}
                        onPress={handleMutePress}
                        traderName={profile?.profile.name}
                        testID={TraderProfileViewSelectorsIDs.MUTE_CHIP}
                      />
                    )}
                  </Box>

                  <Box twClassName="h-px bg-muted mx-4 mt-5 mb-4" />

                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Between}
                    twClassName="px-4 mb-2"
                  >
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      gap={4}
                    >
                      <TabButton
                        label={strings(
                          'social_leaderboard.trader_profile.open',
                        )}
                        isActive={activeTab === 'open'}
                        onPress={() => handleTabChange('open')}
                        testID={TraderProfileViewSelectorsIDs.TAB_OPEN}
                      />
                      <TabButton
                        label={strings(
                          'social_leaderboard.trader_profile.closed',
                        )}
                        isActive={activeTab === 'closed'}
                        onPress={() => handleTabChange('closed')}
                        testID={TraderProfileViewSelectorsIDs.TAB_CLOSED}
                      />
                    </Box>
                    {positions.length > 0 && (
                      <SortButton
                        label={strings(
                          activeTab === 'open'
                            ? OPEN_SORT_LABEL_KEYS[openSort]
                            : CLOSED_SORT_LABEL_KEYS[closedSort],
                        )}
                        onPress={handleSortPress}
                        testID={TraderProfileViewSelectorsIDs.SORT_BUTTON}
                      />
                    )}
                  </Box>

                  {isLoadingPositions && positions.length === 0 ? (
                    POSITION_SKELETON_KEYS.map((key) => (
                      <PositionRowSkeleton key={key} />
                    ))
                  ) : sortedPositions.length === 0 ? (
                    <Box
                      twClassName="px-4 py-8"
                      alignItems={BoxAlignItems.Center}
                    >
                      <Text
                        variant={TextVariant.BodyMd}
                        color={TextColor.TextAlternative}
                      >
                        {strings(
                          'social_leaderboard.trader_profile.no_positions',
                        )}
                      </Text>
                    </Box>
                  ) : (
                    sortedPositions.map((position) => (
                      <PositionRow
                        key={getPositionListKey(position)}
                        position={position}
                        onPress={handlePositionPress}
                        isClosed={activeTab === 'closed'}
                        showTradeDate={currentSortKey === 'recent'}
                      />
                    ))
                  )}
                </>
              )}
            </>
          )}
        </Animated.ScrollView>
      </Box>
    </SafeAreaView>
  );
};

export default TraderProfileView;
