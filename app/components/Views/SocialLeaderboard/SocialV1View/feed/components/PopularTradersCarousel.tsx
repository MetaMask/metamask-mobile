import { Box, SectionHeader } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { useFollowWithNotificationSetup } from '../../../hooks/useFollowWithNotificationSetup';
import {
  POPULAR_TRADERS_DISPLAY_COUNT,
  usePopularTraders,
} from '../hooks/usePopularTraders';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../../../Homepage/Sections/TopTraders/types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ViewMoreCard from '../../../../Homepage/components/ViewMoreCard';
import PopularTraderCard, {
  POPULAR_TRADER_CARD_WIDTH,
} from './PopularTraderCard';
import PopularTraderCardSkeleton from './PopularTraderCardSkeleton';
import { PopularTradersCarouselSelectorsIDs } from './PopularTradersCarousel.testIds';

const SKELETON_KEYS = Array.from(
  { length: POPULAR_TRADERS_DISPLAY_COUNT },
  (_, i) => `popular-trader-skeleton-${i}`,
);

type PopularTradersCarouselItem =
  | { kind: 'trader'; trader: TopTrader }
  | { kind: 'view_more' };

/**
 * Popular traders rail for Social V1 Trending. Horizontal cards of the
 * leaderboard top 10; header chevron and trailing View more open Profiles
 * to follow.
 */
const PopularTradersCarousel: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { followWithSetup } = useFollowWithNotificationSetup();
  const title = strings('social_leaderboard.popular_traders');

  const { traders, isLoading, isFetching, hasFetched, toggleFollow } =
    usePopularTraders();

  const isInFlight = isLoading || isFetching;
  const hasTraders = traders.length > 0;
  const showSkeletons = !hasTraders && (!hasFetched || isInFlight);
  const hideRail = !showSkeletons && !hasTraders;

  const carouselData = useMemo((): PopularTradersCarouselItem[] => {
    const items: PopularTradersCarouselItem[] = traders.map((trader) => ({
      kind: 'trader',
      trader,
    }));
    if (hasTraders) {
      items.push({ kind: 'view_more' });
    }
    return items;
  }, [traders, hasTraders]);

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.PROFILES_TO_FOLLOW);
  }, [navigation]);

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      const trader = traders.find((t) => t.id === traderId);
      navigation.navigate(Routes.SOCIAL.PROFILE, {
        traderId,
        traderName,
        traderAddress: trader?.address,
        source: 'trending_carousel',
        traderRank: trader?.rank,
      });
    },
    [navigation, traders],
  );

  const handleFollowPress = useCallback(
    async (traderId: string) => {
      const trader = traders.find((t) => t.id === traderId);
      await followWithSetup(trader?.isFollowing ?? false, () =>
        toggleFollow(traderId, {
          source: 'trending_carousel',
          traderAddress: trader?.address ?? '',
          traderUsername: trader?.username,
          traderRank: trader?.rank,
          traderAvatarUri: trader?.avatarUri,
        }),
      );
    },
    [traders, toggleFollow, followWithSetup],
  );

  const renderCarouselItem = useCallback(
    ({ item }: { item: PopularTradersCarouselItem }) => {
      if (item.kind === 'view_more') {
        return (
          <ViewMoreCard
            onPress={handleViewAll}
            twClassName={`w-[${POPULAR_TRADER_CARD_WIDTH}px] self-stretch`}
            testID={PopularTradersCarouselSelectorsIDs.VIEW_MORE}
          />
        );
      }

      return (
        <PopularTraderCard
          trader={item.trader}
          onFollowPress={handleFollowPress}
          onTraderPress={handleTraderPress}
        />
      );
    },
    [handleFollowPress, handleTraderPress, handleViewAll],
  );

  const keyExtractor = useCallback(
    (item: PopularTradersCarouselItem) =>
      item.kind === 'view_more' ? 'view-more' : item.trader.id,
    [],
  );

  if (hideRail) {
    return null;
  }

  return (
    <Box testID={PopularTradersCarouselSelectorsIDs.SECTION} twClassName="mb-4">
      <SectionHeader
        title={title}
        isInteractive
        onPress={handleViewAll}
        testID={PopularTradersCarouselSelectorsIDs.HEADER}
      />
      <Box paddingTop={3}>
        {showSkeletons ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('px-4 gap-3')}
            testID={PopularTradersCarouselSelectorsIDs.LIST}
          >
            {SKELETON_KEYS.map((key) => (
              <PopularTraderCardSkeleton key={key} />
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
            testID={PopularTradersCarouselSelectorsIDs.LIST}
          />
        )}
      </Box>
    </Box>
  );
};

export default PopularTradersCarousel;
