import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import Routes from '../../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import ErrorState from '../../components/ErrorState';
import ViewMoreCard from '../../components/ViewMoreCard';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { SectionRefreshHandle } from '../../types';
import { TopTraderCard, TopTraderCardSkeleton } from './components';
import {
  TOP_TRADER_CARD_HEIGHT,
  TOP_TRADER_CARD_WIDTH,
} from './components/TopTraderCard';
import { useTopTraders } from './hooks';

const HOME_TRADER_LIMIT = 10;
const SKELETON_KEYS = Array.from(
  { length: HOME_TRADER_LIMIT },
  (_, i) => `home-trader-skeleton-${i}`,
);

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

  const { traders, isLoading, isFetching, error, refresh, toggleFollow } =
    useTopTraders({
      limit: HOME_TRADER_LIMIT,
      enabled: isEnabled,
    });

  useImperativeHandle(
    ref,
    () => ({
      refresh,
    }),
    [refresh],
  );

  const { onLayout } = useHomeViewedEvent({
    sectionRef: sectionViewRef,
    isLoading,
    sectionName: HomeSectionNames.TOP_TRADERS,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty: traders.length === 0,
    itemCount: traders.length,
  });

  useSectionPerformance({
    sectionId: HomeSectionNames.TOP_TRADERS,
    contentReady: !isLoading && traders.length > 0,
    isEmpty: !isLoading && traders.length === 0,
    isLoading,
    enabled: isEnabled,
  });

  const isInFlight = isLoading || isFetching;
  const hasTraders = traders.length > 0;
  const hasError = Boolean(error);
  const showError = hasError && !isFetching && !hasTraders;
  const showSkeletons = isInFlight;
  const showViewMore = !isInFlight && hasTraders;
  const isEmpty = !isInFlight && !hasError && !hasTraders;

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW);
  }, [navigation]);

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string, rank: number) => {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName,
        rank,
      });
    },
    [navigation],
  );

  if (!isEnabled || isEmpty) {
    return null;
  }

  if (showError) {
    return (
      <View
        ref={sectionViewRef}
        onLayout={onLayout}
        testID="homepage-top-traders-section-root"
      >
        <Box gap={3}>
          <SectionHeader title={title} onPress={handleViewAll} />
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
      onLayout={onLayout}
      testID="homepage-top-traders-section-root"
    >
      <Box gap={3}>
        <SectionHeader title={title} onPress={handleViewAll} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 gap-3 pb-2')}
          testID="homepage-top-traders-carousel"
        >
          {showSkeletons
            ? SKELETON_KEYS.map((key) => <TopTraderCardSkeleton key={key} />)
            : traders.map((trader) => (
                <TopTraderCard
                  key={trader.id}
                  trader={trader}
                  onFollowPress={toggleFollow}
                  onTraderPress={handleTraderPress}
                />
              ))}
          {showViewMore && (
            <ViewMoreCard
              onPress={handleViewAll}
              twClassName={`w-[${TOP_TRADER_CARD_WIDTH}px] h-[${TOP_TRADER_CARD_HEIGHT}px]`}
              testID="top-traders-view-more-card"
            />
          )}
        </ScrollView>
      </Box>
    </View>
  );
});

export default TopTradersSection;
