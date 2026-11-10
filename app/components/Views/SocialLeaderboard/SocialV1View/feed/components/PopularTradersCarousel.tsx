import { Box, SectionHeader } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { FlatList, ScrollView } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { navigateToSocialV1Profile } from '../../../navigation/navigateToSocialV1Profile';
import { useFollowWithNotificationSetup } from '../../../hooks/useFollowWithNotificationSetup';
import {
  POPULAR_TRADERS_DISPLAY_COUNT,
  usePopularTraders,
} from '../hooks/usePopularTraders';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../../../Homepage/Sections/TopTraders/types';
import PopularTraderCard from './PopularTraderCard';
import PopularTraderCardSkeleton from './PopularTraderCardSkeleton';
import { PopularTradersCarouselSelectorsIDs } from './PopularTradersCarousel.testIds';

const SKELETON_KEYS = Array.from(
  { length: POPULAR_TRADERS_DISPLAY_COUNT },
  (_, i) => `popular-trader-skeleton-${i}`,
);

/**
 * Popular traders rail for Social V1 Trending. Horizontal cards of the
 * leaderboard top 10; the header chevron opens Profiles to follow.
 */
const PopularTradersCarousel: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { followWithSetup } = useFollowWithNotificationSetup({
    requireSocialTerms: true,
    requireSocialProfile: true,
  });
  const title = strings('social_leaderboard.popular_traders');

  const { traders, isLoading, isFetching, hasFetched, toggleFollow } =
    usePopularTraders();

  const isInFlight = isLoading || isFetching;
  const hasTraders = traders.length > 0;
  const showSkeletons = !hasTraders && (!hasFetched || isInFlight);
  const hideRail = !showSkeletons && !hasTraders;

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.PROFILES_TO_FOLLOW);
  }, [navigation]);

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      const trader = traders.find((t) => t.id === traderId);
      navigateToSocialV1Profile(navigation, {
        traderId,
        traderName,
        traderAddress: trader?.address,
        traderAvatarUri: trader?.avatarUri,
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
    ({ item }: { item: TopTrader }) => (
      <PopularTraderCard
        trader={item}
        onFollowPress={handleFollowPress}
        onTraderPress={handleTraderPress}
      />
    ),
    [handleFollowPress, handleTraderPress],
  );

  const keyExtractor = useCallback((item: TopTrader) => item.id, []);

  if (hideRail) {
    return null;
  }

  return (
    <Box
      testID={PopularTradersCarouselSelectorsIDs.SECTION}
      twClassName="-mt-4"
    >
      <SectionHeader
        title={title}
        isInteractive
        onPress={handleViewAll}
        twClassName="py-0"
        testID={PopularTradersCarouselSelectorsIDs.HEADER}
      />
      <Box paddingTop={3}>
        {showSkeletons ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('px-4 gap-2')}
            testID={PopularTradersCarouselSelectorsIDs.LIST}
          >
            {SKELETON_KEYS.map((key) => (
              <PopularTraderCardSkeleton key={key} />
            ))}
          </ScrollView>
        ) : (
          <FlatList
            horizontal
            data={traders}
            renderItem={renderCarouselItem}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('px-4 gap-2 items-stretch')}
            testID={PopularTradersCarouselSelectorsIDs.LIST}
          />
        )}
      </Box>
    </Box>
  );
};

export default PopularTradersCarousel;
