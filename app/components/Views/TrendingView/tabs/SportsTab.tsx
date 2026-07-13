import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
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
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import { useTheme } from '../../../../util/theme';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import PredictMarket from '../../../UI/Predict/components/PredictMarket';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import { useWorldCupPredictionsFeed } from '../feeds/predictions/useWorldCupPredictionsFeed';
import {
  useSportsMarketsFeed,
  type UseSportsMarketsFeedResult,
} from '../feeds/predictions/useSportsMarketsFeed';
import PredictionsCarouselSection from '../feeds/predictions/PredictionsCarouselSection';
import PredictionsSkeleton from '../feeds/predictions/PredictionsSkeleton';
import {
  navigateToExplorePredictionsList,
  navigateToExploreWorldCupPredictions,
} from '../feeds/predictions/predictionsNavigation';
import PillRow from '../components/PillRow';
import type { TabProps } from '../hooks/useExploreRefresh';
import {
  trackExploreInteracted,
  type ExploreSectionName,
} from '../search/analytics';
import { PredictEventValues } from '../../../UI/Predict/constants/eventNames';

const SPORT_KEY_TO_SECTION: Record<string, ExploreSectionName> = {
  soccer: 'predictions_football',
  basketball: 'predictions_basketball',
  tennis: 'predictions_tennis',
};

interface SportsListHeaderProps {
  showSportsPredictions: boolean;
  sportsPredictionsData: PredictMarketType[];
  sportsPredictionsLoading: boolean;
  showWorldCupPredictions: boolean;
  sportsMarkets: UseSportsMarketsFeedResult;
  showAllSportsSkeleton: boolean;
  showAllSportsEmpty: boolean;
  navigation: AppNavigationProp;
}

const SportsListHeader: React.FC<SportsListHeaderProps> = ({
  showSportsPredictions,
  sportsPredictionsData,
  sportsPredictionsLoading,
  showWorldCupPredictions,
  sportsMarkets,
  showAllSportsSkeleton,
  showAllSportsEmpty,
  navigation,
}) => (
  <>
    <Box twClassName={showSportsPredictions ? 'pb-3' : undefined}>
      <PredictionsCarouselSection
        feed={{
          data: sportsPredictionsData,
          isLoading: sportsPredictionsLoading,
        }}
        tabName="Sports"
        sectionName="predictions_sports"
        title={
          showWorldCupPredictions
            ? strings('predict.world_cup.predictions_title')
            : strings('trending.predictions')
        }
        testIdPrefix="predict-sports-market-row-item"
        idPrefix="sports_predictions"
        onViewAll={() =>
          showWorldCupPredictions
            ? navigateToExploreWorldCupPredictions(navigation)
            : navigateToExplorePredictionsList(navigation, 'sports')
        }
        isEnabled={showSportsPredictions}
      />
    </Box>

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
              <PredictionsSkeleton />
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
  </>
);

const SportsTab: React.FC<TabProps> = ({ refresh, refreshing, onRefresh }) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const { colors } = useTheme();

  const worldCupPredictions = useWorldCupPredictionsFeed({
    enabled: isPredictEnabled,
    refresh,
  });
  const sportsPredictions = usePredictionsFeed({
    variant: 'sports',
    refresh,
    enabled: !worldCupPredictions.isEnabled,
  });
  const displayedSportsPredictions = worldCupPredictions.isEnabled
    ? worldCupPredictions
    : sportsPredictions;
  const sportsMarkets = useSportsMarketsFeed({ refresh });

  const { active, activeKey } = sportsMarkets;
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;

  const renderActiveMarketItem: ListRenderItem<PredictMarketType> = useCallback(
    ({ item, index }) => {
      const sectionName =
        SPORT_KEY_TO_SECTION[activeKeyRef.current] ?? 'predictions_football';
      return (
        <Box twClassName="px-4">
          <PredictMarket
            market={item}
            entryPoint={PredictEventValues.ENTRY_POINT.EXPLORE}
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
    },
    [],
  );

  const showSportsPredictions =
    isPredictEnabled &&
    (displayedSportsPredictions.isLoading ||
      displayedSportsPredictions.data.length > 0);
  const showAllSportsSkeleton =
    active.isFetching && active.marketData.length === 0;
  const showAllSportsEmpty =
    !showAllSportsSkeleton && active.marketData.length === 0;

  const listHeader = (
    <SportsListHeader
      showSportsPredictions={showSportsPredictions}
      sportsPredictionsData={displayedSportsPredictions.data}
      sportsPredictionsLoading={displayedSportsPredictions.isLoading}
      showWorldCupPredictions={worldCupPredictions.isEnabled}
      sportsMarkets={sportsMarkets}
      showAllSportsSkeleton={showAllSportsSkeleton}
      showAllSportsEmpty={showAllSportsEmpty}
      navigation={navigation}
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
    <FlashList<PredictMarketType>
      data={listData}
      renderItem={renderActiveMarketItem}
      keyExtractor={(_, index) => `all_sports-${activeKey}-${index}`}
      getItemType={() => 'market'}
      ListHeaderComponent={listHeader}
      ListFooterComponent={listFooter}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={tw.style('pt-3 pb-4')}
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
