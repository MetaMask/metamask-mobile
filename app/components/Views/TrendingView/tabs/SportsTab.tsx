import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  SectionDivider,
  SectionHeader,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useTheme } from '../../../../util/theme';
import {
  PredictTrendingCarousel,
  PredictTrendingMarketCard,
  PredictTrendingSkeleton,
  selectPredictAvailability,
  usePredictEntryActions,
  usePredictSportsMarketsFeed,
  usePredictTrendingFeed,
  usePredictTrendingSupported,
  type PredictEntryActions,
  type PredictSportsMarketsFeed,
  type PredictTrendingMarket,
} from '../../../UI/PredictNext';
import { strings } from '../../../../../locales/i18n';
import { navigateToExplorePredictionsList } from '../feeds/predictions/predictionsNavigation';
import PillRow from '../components/PillRow';
import type { TabProps } from '../hooks/useExploreRefresh';
import {
  trackExploreInteracted,
  type ExploreSectionName,
} from '../search/analytics';

const SPORT_KEY_TO_SECTION: Record<string, ExploreSectionName> = {
  soccer: 'predictions_football',
  basketball: 'predictions_basketball',
  tennis: 'predictions_tennis',
};

interface SportsListHeaderProps {
  showSportsPredictions: boolean;
  sportsPredictionsData: PredictTrendingMarket[];
  sportsPredictionsLoading: boolean;
  sportsMarkets: PredictSportsMarketsFeed;
  showAllSports: boolean;
  showAllSportsSkeleton: boolean;
  showAllSportsEmpty: boolean;
  openPredict: PredictEntryActions['openPredict'];
}

const SportsListHeader: React.FC<SportsListHeaderProps> = ({
  showSportsPredictions,
  sportsPredictionsData,
  sportsPredictionsLoading,
  sportsMarkets,
  showAllSports,
  showAllSportsSkeleton,
  showAllSportsEmpty,
  openPredict,
}) => (
  <>
    <Box twClassName={showSportsPredictions ? 'pb-3' : undefined}>
      <PredictTrendingCarousel
        feed={{
          data: sportsPredictionsData,
          isLoading: sportsPredictionsLoading,
        }}
        tabName="Sports"
        sectionName="predictions_sports"
        title={strings('trending.predictions')}
        testIdPrefix="predict-sports-market-row-item"
        idPrefix="sports_predictions"
        onViewAll={() =>
          navigateToExplorePredictionsList(openPredict, 'sports')
        }
        isEnabled={showSportsPredictions}
      />
    </Box>

    {showAllSports ? (
      <Box>
        {showSportsPredictions ? <SectionDivider /> : null}
        <SectionHeader
          title={strings('trending.all_sports')}
          testID="section-header-view-all-all_sports"
        />
        <PillRow
          pills={sportsMarkets.pills}
          activeKey={sportsMarkets.activeKey}
          onSelect={sportsMarkets.select}
          testIdPrefix="all-sports"
        />

        {showAllSportsSkeleton && (
          <Box twClassName="gap-2 px-4">
            {[0, 1, 2].map((i) => (
              <Box
                key={`all-sports-skeleton-${i}`}
                twClassName="h-[220px] w-full overflow-hidden rounded-2xl"
              >
                <PredictTrendingSkeleton />
              </Box>
            ))}
          </Box>
        )}

        {showAllSportsEmpty && (
          <Box twClassName="items-center py-8" testID="all-sports-empty-state">
            <TabEmptyState
              description={strings('trending.all_sports_no_markets')}
            />
          </Box>
        )}
      </Box>
    ) : null}
  </>
);

const SportsTab: React.FC<TabProps> = ({ refresh, refreshing, onRefresh }) => {
  const tw = useTailwind();
  const floatingTabBarInset = useFloatingTabBarInset();
  const { openPredict } = usePredictEntryActions();
  const isPredictEnabled = useSelector(selectPredictAvailability);
  const { colors } = useTheme();

  const sportsPredictions = usePredictTrendingFeed({
    variant: 'sports',
    refresh,
    enabled: isPredictEnabled,
  });
  const sportsMarkets = usePredictSportsMarketsFeed({ refresh });
  const showAllSports = usePredictTrendingSupported();

  const { active, activeKey } = sportsMarkets;
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;

  const renderActiveMarketItem: ListRenderItem<PredictTrendingMarket> =
    useCallback(({ item, index }) => {
      const sectionName =
        SPORT_KEY_TO_SECTION[activeKeyRef.current] ?? 'predictions_football';
      return (
        <Box twClassName="px-4">
          <PredictTrendingMarketCard
            market={item}
            onCardPress={() =>
              trackExploreInteracted({
                interaction_type: 'section_item_tapped',
                tab_name: 'Sports',
                section_name: sectionName,
                asset_type: 'prediction',
                position: index,
                item_clicked: item.id,
              })
            }
            onBuyButtonPress={({ market }) =>
              trackExploreInteracted({
                interaction_type: 'prediction_voted',
                tab_name: 'Sports',
                section_name: sectionName,
                item_clicked: market.id,
              })
            }
          />
        </Box>
      );
    }, []);

  const showSportsPredictions =
    isPredictEnabled &&
    (sportsPredictions.isLoading || sportsPredictions.data.length > 0);
  const showAllSportsSkeleton =
    active.isFetching && active.marketData.length === 0;
  const showAllSportsEmpty =
    !showAllSportsSkeleton && active.marketData.length === 0;

  const listHeader = (
    <SportsListHeader
      showSportsPredictions={showSportsPredictions}
      sportsPredictionsData={sportsPredictions.data}
      sportsPredictionsLoading={sportsPredictions.isLoading}
      sportsMarkets={sportsMarkets}
      showAllSports={showAllSports}
      showAllSportsSkeleton={showAllSportsSkeleton}
      showAllSportsEmpty={showAllSportsEmpty}
      openPredict={openPredict}
    />
  );

  const listFooter =
    active.hasMore && active.marketData.length > 0 ? (
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Center}
        twClassName="mt-3 mb-9"
      >
        <TouchableOpacity
          onPress={active.fetchMore}
          disabled={active.isFetchingMore}
          testID="all-sports-load-more"
        >
          {active.isFetchingMore ? (
            <ActivityIndicator color={colors.primary.default} />
          ) : (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.PrimaryDefault}
            >
              {strings('trending.load_more')}
            </Text>
          )}
        </TouchableOpacity>
      </Box>
    ) : (
      <Box twClassName="mb-9" />
    );

  const listData =
    showAllSportsSkeleton || showAllSportsEmpty ? [] : active.marketData;

  return (
    <FlashList<PredictTrendingMarket>
      data={listData}
      renderItem={renderActiveMarketItem}
      keyExtractor={(item) => `all_sports-${activeKey}-${item.id}`}
      getItemType={() => 'market'}
      ListHeaderComponent={listHeader}
      ListFooterComponent={listFooter}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={tw.style(
        `pt-3 pb-[${16 + floatingTabBarInset}px]`,
      )}
      testID={`all-sports-list-${activeKey}`}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.icon.default}
          colors={[colors.primary.default]}
        />
      }
    />
  );
};

export default SportsTab;
