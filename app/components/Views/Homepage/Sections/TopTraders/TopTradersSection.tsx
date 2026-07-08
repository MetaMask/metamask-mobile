import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlatList, View, type ViewToken } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import ErrorState from '../../components/ErrorState';
import ViewMoreCard from '../../components/ViewMoreCard';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import useSectionViewportVisible from '../../hooks/useSectionViewportVisible';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { SectionRefreshHandle } from '../../types';
import { TopTraderCard, TopTraderCardSkeleton } from './components';
import { TOP_TRADER_CARD_WIDTH } from './components/TopTraderCard';
import { ALL_CHAINS } from '../../../shared/top-traders-constants';
import { usePrefetchTraderProfiles, useTopTraders } from './hooks';
import type { TopTrader } from './types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';

const HOME_TRADER_DISPLAY_COUNT = 10;
const HOME_TRADER_FETCH_LIMIT = 50;
const SKELETON_KEYS = Array.from(
  { length: HOME_TRADER_DISPLAY_COUNT },
  (_, i) => `home-trader-skeleton-${i}`,
);

const viewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

type TopTradersCarouselItem =
  | { kind: 'trader'; trader: TopTrader }
  | { kind: 'view_more' };

interface TopTradersSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * TopTradersSection -- Social leaderboard entry point on the homepage.
 *
 * Renders a section header plus a horizontally scrollable row of the
 * top 10 trader cards. Tapping the header chevron navigates to the
 * full TopTradersView.
 */
const TopTradersSection = forwardRef<
  SectionRefreshHandle,
  TopTradersSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const sectionViewRef = useRef<View>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);
  const title = strings('homepage.sections.top_traders');
  const [visibleTraderIds, setVisibleTraderIds] = useState<string[]>([]);

  const {
    traders: allTraders,
    isLoading,
    isFetching,
    error,
    refresh,
    toggleFollow,
  } = useTopTraders({
    limit: HOME_TRADER_FETCH_LIMIT,
    chains: ALL_CHAINS,
    enabled: isEnabled,
  });

  // Trimming the shared fetch to the display count here; matches TopTradersView "All".
  const traders = useMemo(
    () => allTraders.slice(0, HOME_TRADER_DISPLAY_COUNT),
    [allTraders],
  );

  useImperativeHandle(
    ref,
    () => ({
      refresh,
    }),
    [refresh],
  );

  const isInFlight = isLoading || isFetching;
  const hasTraders = traders.length > 0;
  const hasError = Boolean(error);
  const showError = hasError && !isFetching && !hasTraders;
  const willRender = isEnabled && (isInFlight || hasError || hasTraders);

  const { onLayout: homeViewedOnLayout } = useHomeViewedEvent({
    sectionRef: willRender ? sectionViewRef : null,
    isLoading,
    sectionName: HomeSectionNames.TOP_TRADERS,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty: traders.length === 0,
    itemCount: traders.length,
  });

  const { isVisible: isSectionVisible, onLayout: sectionVisibleOnLayout } =
    useSectionViewportVisible(sectionViewRef, { isLoading });

  usePrefetchTraderProfiles(visibleTraderIds, {
    enabled: isEnabled && hasTraders,
    isSectionVisible,
  });

  const handleSectionLayout = useCallback(() => {
    homeViewedOnLayout();
    sectionVisibleOnLayout();
  }, [homeViewedOnLayout, sectionVisibleOnLayout]);

  useSectionPerformance({
    sectionId: HomeSectionNames.TOP_TRADERS,
    contentReady: !isLoading && hasTraders,
    // Exclude error renders from the empty bucket so Sentry doesn't conflate
    // visible error states (which render the retry UI) with truly empty
    // sections. Without this, a fetch error with no cached traders would be
    // reported as `content_state: 'empty'`.
    isEmpty: !isLoading && !hasError && !hasTraders,
    isLoading,
    // Disable telemetry once we render the error UI so the in-flight TTC and
    // data-fetch spans get closed via the hook's cleanup instead of remaining
    // open until the user navigates away.
    enabled: isEnabled && !showError,
  });

  const showSkeletons = isInFlight && !hasTraders;
  const showViewMore = hasTraders;
  const isEmpty = !isInFlight && !hasError && !hasTraders;

  const carouselData = useMemo((): TopTradersCarouselItem[] => {
    const items: TopTradersCarouselItem[] = traders.map((trader) => ({
      kind: 'trader',
      trader,
    }));

    if (showViewMore) {
      items.push({ kind: 'view_more' });
    }

    return items;
  }, [traders, showViewMore]);

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW, {
      source: 'home_carousel',
    });
  }, [navigation]);

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      const trader = traders.find((t) => t.id === traderId);
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName,
        traderAddress: trader?.address,
        source: 'home_carousel',
        traderRank: trader?.rank,
      });
    },
    [navigation, traders],
  );

  const handleFollowPress = useCallback(
    (traderId: string) => {
      const trader = traders.find((t) => t.id === traderId);
      toggleFollow(traderId, {
        source: 'home_carousel',
        traderAddress: trader?.address ?? '',
        traderUsername: trader?.username,
        traderRank: trader?.rank,
      });
    },
    [traders, toggleFollow],
  );

  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken<TopTradersCarouselItem>[];
    }) => {
      const ids = viewableItems
        .filter(
          (
            token,
          ): token is ViewToken<TopTradersCarouselItem> & {
            item: { kind: 'trader'; trader: TopTrader };
          } => token.item?.kind === 'trader',
        )
        .map((token) => token.item.trader.id);
      setVisibleTraderIds(ids);
    },
  ).current;

  const renderCarouselItem = useCallback(
    ({ item }: { item: TopTradersCarouselItem }) => {
      if (item.kind === 'view_more') {
        return (
          <ViewMoreCard
            onPress={handleViewAll}
            twClassName={`w-[${TOP_TRADER_CARD_WIDTH}px] self-stretch`}
            testID="top-traders-view-more-card"
          />
        );
      }

      return (
        <TopTraderCard
          trader={item.trader}
          onFollowPress={handleFollowPress}
          onTraderPress={handleTraderPress}
        />
      );
    },
    [handleFollowPress, handleTraderPress, handleViewAll],
  );

  const keyExtractor = useCallback(
    (item: TopTradersCarouselItem) =>
      item.kind === 'view_more' ? 'view-more' : item.trader.id,
    [],
  );

  if (!isEnabled || isEmpty) {
    return null;
  }

  if (showError) {
    return (
      <View
        ref={sectionViewRef}
        onLayout={handleSectionLayout}
        testID="homepage-top-traders-section-root"
      >
        <Box paddingBottom={3}>
          <SectionDivider />
          <SectionHeader
            title={title}
            isInteractive
            onPress={handleViewAll}
            testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE(
              'top-traders',
            )}
          />
          <ErrorState
            title={strings('homepage.error.unable_to_load', {
              section: title.toLowerCase(),
            })}
            onRetry={refresh}
          />
        </Box>
      </View>
    );
  }

  return (
    <View
      ref={sectionViewRef}
      onLayout={handleSectionLayout}
      testID="homepage-top-traders-section-root"
    >
      <Box paddingBottom={3}>
        <SectionDivider />
        <SectionHeader
          title={title}
          isInteractive
          onPress={handleViewAll}
          testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('top-traders')}
        />
        {showSkeletons ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('px-4 gap-3')}
            testID="homepage-top-traders-carousel"
          >
            {SKELETON_KEYS.map((key) => (
              <TopTraderCardSkeleton key={key} />
            ))}
          </ScrollView>
        ) : (
          <FlatList
            horizontal
            data={carouselData}
            renderItem={renderCarouselItem}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('px-4 gap-3 items-stretch')}
            testID="homepage-top-traders-carousel"
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
          />
        )}
      </Box>
    </View>
  );
});

export default TopTradersSection;
