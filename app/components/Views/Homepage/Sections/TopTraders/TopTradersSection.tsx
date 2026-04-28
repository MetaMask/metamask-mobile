import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import { SectionRefreshHandle } from '../../types';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { TopTraderCard, TopTraderCardSkeleton } from './components';
import { useTopTraders } from './hooks';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import ViewMoreCard from '../../components/ViewMoreCard';

const HOME_TRADER_LIMIT = 3;
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
 * top 3 trader cards. Tapping the header chevron navigates to the
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

  const { traders, isLoading, refresh, toggleFollow } = useTopTraders({
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

  if (!isEnabled || (!isLoading && traders.length === 0)) {
    return null;
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
          {isLoading
            ? SKELETON_KEYS.map((key) => <TopTraderCardSkeleton key={key} />)
            : traders.map((trader) => (
                <TopTraderCard
                  key={trader.id}
                  trader={trader}
                  onFollowPress={handleFollowPress}
                  onTraderPress={handleTraderPress}
                />
              ))}
          {!isLoading && traders.length > 0 && (
            <ViewMoreCard
              onPress={handleViewAll}
              twClassName="w-[200px] h-[180px]"
              testID="top-traders-view-more-card"
            />
          )}
        </ScrollView>
      </Box>
    </View>
  );
});

export default TopTradersSection;
