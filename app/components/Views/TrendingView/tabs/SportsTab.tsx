import React, { useCallback } from 'react';
import { ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import { useAppThemeFromContext } from '../../../../util/theme';
import type { Theme } from '../../../../util/theme/models';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import PredictMarket from '../../../UI/Predict/components/PredictMarket';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import { useSportsMarketsFeed } from '../feeds/predictions/useSportsMarketsFeed';
import { PredictionCarouselRowItem } from '../feeds/predictions/PredictionRowItem';
import PredictionsSkeleton from '../feeds/predictions/PredictionsSkeleton';
import { navigateToPredictionsList } from '../feeds/predictions/predictionsNavigation';
import ExploreScroll from '../components/ExploreScroll';
import HorizontalCarousel from '../components/HorizontalCarousel';
import PillRow from '../components/PillRow';
import SectionHeader from '../components/SectionHeader';
import type { TabProps } from '../hooks/useExploreRefresh';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loadMore: { color: theme.colors.primary.default },
  });

const SportsTab: React.FC<TabProps> = ({ refresh, refreshing, onRefresh }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const theme = useAppThemeFromContext();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const sportsPredictions = usePredictionsFeed({
    variant: 'sports',
    refresh,
  });
  const sportsMarkets = useSportsMarketsFeed({ refresh });

  const renderPredictionItem: ListRenderItem<PredictMarketType> = useCallback(
    ({ item }) => (
      <PredictionCarouselRowItem
        market={item}
        testIdPrefix="predict-sports-market-row-item"
      />
    ),
    [],
  );

  const renderActiveMarketItem: ListRenderItem<PredictMarketType> = useCallback(
    ({ item }) => <PredictMarket market={item} />,
    [],
  );

  const showSportsPredictions =
    isPredictEnabled &&
    (sportsPredictions.isLoading || sportsPredictions.data.length > 0);

  const { active, activeKey } = sportsMarkets;
  const showAllSportsSkeleton =
    active.isFetching && active.marketData.length === 0;
  const showAllSportsEmpty =
    !showAllSportsSkeleton && active.marketData.length === 0;

  return (
    <ExploreScroll refreshing={refreshing} onRefresh={onRefresh}>
      {showSportsPredictions && (
        <Box>
          <SectionHeader
            title={strings('trending.predictions')}
            onViewAll={() => navigateToPredictionsList(navigation, 'sports')}
            testID="section-header-view-all-sports_predictions"
          />
          <HorizontalCarousel<PredictMarketType>
            data={sportsPredictions.data}
            isLoading={sportsPredictions.isLoading}
            renderItem={renderPredictionItem}
            Skeleton={PredictionsSkeleton}
            idPrefix="sports_predictions"
          />
        </Box>
      )}

      <Box>
        <SectionHeader
          title={strings('trending.all_sports')}
          testID="section-header-view-all-all_sports"
        />
        <Box twClassName="mt-2 mb-9">
          <PillRow
            pills={sportsMarkets.pills}
            activeKey={sportsMarkets.activeKey}
            onSelect={sportsMarkets.select}
            testIdPrefix="all-sports"
          />

          {showAllSportsSkeleton ? (
            <Box twClassName="gap-2">
              {[0, 1, 2].map((i) => (
                <Box
                  key={`all-sports-skeleton-${i}`}
                  twClassName="h-[220px] w-full overflow-hidden rounded-2xl"
                >
                  <PredictionsSkeleton />
                </Box>
              ))}
            </Box>
          ) : showAllSportsEmpty ? (
            <Box
              twClassName="items-center py-8"
              testID="all-sports-empty-state"
            >
              <TabEmptyState
                description={strings('trending.all_sports_no_markets')}
              />
            </Box>
          ) : (
            <>
              <FlashList
                data={active.marketData}
                renderItem={renderActiveMarketItem}
                keyExtractor={(_, index) => `all_sports-${activeKey}-${index}`}
                scrollEnabled={false}
                keyboardShouldPersistTaps="handled"
                testID={`all-sports-list-${activeKey}`}
              />

              {active.hasMore && (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  justifyContent={BoxJustifyContent.Center}
                  twClassName="mt-3"
                >
                  <TouchableOpacity
                    onPress={active.fetchMore}
                    disabled={active.isFetchingMore}
                    testID="all-sports-load-more"
                  >
                    {active.isFetchingMore ? (
                      <ActivityIndicator color={theme.colors.primary.default} />
                    ) : (
                      <Text
                        variant={TextVariant.BodySm}
                        fontWeight={FontWeight.Medium}
                        color={TextColor.PrimaryDefault}
                        style={styles.loadMore}
                      >
                        {strings('trending.load_more')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </ExploreScroll>
  );
};

export default SportsTab;
