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
import {
  useSportsMarketsFeed,
  type UseSportsMarketsFeedResult,
} from '../feeds/predictions/useSportsMarketsFeed';
import { PredictionCarouselRowItem } from '../feeds/predictions/PredictionRowItem';
import PredictionsSkeleton from '../feeds/predictions/PredictionsSkeleton';
import { navigateToPredictionsList } from '../feeds/predictions/predictionsNavigation';
import HorizontalCarousel from '../components/HorizontalCarousel';
import PillRow from '../components/PillRow';
import SectionHeader from '../components/SectionHeader';
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
  sportsPredictionsData: PredictMarketType[];
  sportsPredictionsLoading: boolean;
  sportsMarkets: UseSportsMarketsFeedResult;
  showAllSportsSkeleton: boolean;
  showAllSportsEmpty: boolean;
  navigation: AppNavigationProp;
}

const renderPredictionItem: ListRenderItem<PredictMarketType> = ({
  item,
  index,
}) => (
  <PredictionCarouselRowItem
    market={item}
    testIdPrefix="predict-sports-market-row-item"
    onBeforePress={() =>
      trackExploreInteracted({
        interaction_type: 'section_item_tapped',
        tab_name: 'Sports',
        section_name: 'predictions_sports',
        asset_type: 'prediction',
        position: index,
        item_clicked: item.id,
      })
    }
    onVote={(marketId) =>
      trackExploreInteracted({
        interaction_type: 'prediction_voted',
        tab_name: 'Sports',
        section_name: 'predictions_sports',
        item_clicked: marketId,
      })
    }
  />
);

const SportsListHeader: React.FC<SportsListHeaderProps> = ({
  showSportsPredictions,
  sportsPredictionsData,
  sportsPredictionsLoading,
  sportsMarkets,
  showAllSportsSkeleton,
  showAllSportsEmpty,
  navigation,
}) => (
  <Box twClassName="pt-3">
    {showSportsPredictions && (
      <Box>
        <SectionHeader
          title={strings('trending.predictions')}
          onViewAll={() => navigateToPredictionsList(navigation, 'sports')}
          testID="section-header-view-all-sports_predictions"
          tabName="Sports"
          sectionName="predictions_sports"
        />
        <HorizontalCarousel<PredictMarketType>
          data={sportsPredictionsData}
          isLoading={sportsPredictionsLoading}
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
      <Box twClassName="mt-2">
        <PillRow
          pills={sportsMarkets.pills}
          activeKey={sportsMarkets.activeKey}
          onSelect={sportsMarkets.select}
          testIdPrefix="all-sports"
        />
      </Box>

      {showAllSportsSkeleton && (
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
      )}

      {showAllSportsEmpty && (
        <Box twClassName="items-center py-8" testID="all-sports-empty-state">
          <TabEmptyState
            description={strings('trending.all_sports_no_markets')}
          />
        </Box>
      )}
    </Box>
  </Box>
);

const SportsTab: React.FC<TabProps> = ({ refresh, refreshing, onRefresh }) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const { colors } = useTheme();

  const sportsPredictions = usePredictionsFeed({ variant: 'sports', refresh });
  const sportsMarkets = useSportsMarketsFeed({ refresh });

  const { active, activeKey } = sportsMarkets;
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;

  const renderActiveMarketItem: ListRenderItem<PredictMarketType> = useCallback(
    ({ item, index }) => {
      const sectionName =
        SPORT_KEY_TO_SECTION[activeKeyRef.current] ?? 'predictions_football';
      return (
        <PredictMarket
          market={item}
          onBeforePress={() =>
            trackExploreInteracted({
              interaction_type: 'section_item_tapped',
              tab_name: 'Sports',
              section_name: sectionName,
              asset_type: 'prediction',
              position: index,
              item_clicked: item.id,
            })
          }
          onVote={(marketId) =>
            trackExploreInteracted({
              interaction_type: 'prediction_voted',
              tab_name: 'Sports',
              section_name: sectionName,
              item_clicked: marketId,
            })
          }
        />
      );
    },
    [],
  );

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

  // When loading or empty, data is empty — header renders those states.
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
      contentContainerStyle={tw.style('px-4')}
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
