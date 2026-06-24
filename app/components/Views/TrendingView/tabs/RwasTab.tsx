import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  applyMarketFilters,
  type PerpsMarketData,
  type SortOptionId,
} from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import { TokenRowItem } from '../feeds/tokens/TokenRowItem';
import TrendingTokensSkeleton from '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import {
  STOCKS_FEED_PREVIEW_PAGE_SIZE,
  useStocksFeed,
} from '../feeds/stocks/useStocksFeed';
import { getCaipChainIdFromAssetId } from '../../../UI/Trending/components/TrendingTokenRowItem/utils';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import PerpsSectionProvider from '../feeds/perps/PerpsSectionProvider';
import PerpsToggleBlock, {
  type PerpsFilterKey,
} from '../feeds/perps/PerpsToggleBlock';
import { normalizeFilterKey } from '../../../UI/Perps/utils/marketCategoryMapping';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import PredictionsCarouselSection from '../feeds/predictions/PredictionsCarouselSection';
import { navigateToExplorePredictionsList } from '../feeds/predictions/predictionsNavigation';
import CardList from '../components/CardList';
import ExploreScroll from '../components/ExploreScroll';
import ExploreSectionList, {
  type ExploreSectionItem,
} from '../components/ExploreSectionList';
import SectionHeader from '../components/SectionHeader';
import type { PillToggleCardListTab } from '../components/PillToggleCardList';
import type { TabProps } from '../hooks/useExploreRefresh';
import { trackExploreInteracted } from '../search/analytics';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';
import TrendingQuickBuy from '../../../UI/Trending/components/TrendingQuickBuy/TrendingQuickBuy';
import { useABTest } from '../../../../hooks/useABTest';
import {
  EXPLORE_QUICK_BUY_AB_KEY,
  EXPLORE_QUICK_BUY_VARIANTS,
  EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
} from '../search/abTestConfig';

const styles = StyleSheet.create({
  container: { flex: 1 },
});

/** Perps category pills for the RWAs tab, in perps display order. */
const RWA_PERPS_CATEGORIES: PerpsFilterKey[] = [
  'stock',
  'pre-ipo',
  'forex',
  'index',
  'etf',
];

interface RwaPerpsBlockProps {
  refresh: TabProps['refresh'];
  onViewAll: (filter: PerpsFilterKey, sortOptionId: SortOptionId) => void;
}

const RwaPerpsBlock: React.FC<RwaPerpsBlockProps> = ({
  refresh,
  onViewAll,
}) => {
  const perps = usePerpsFeed({ variant: 'rwa', refresh });
  const markets = useMemo(() => perps.data.map((d) => d.market), [perps.data]);

  const tabs = useMemo<PillToggleCardListTab<PerpsMarketData>[]>(
    () =>
      RWA_PERPS_CATEGORIES.map((category) => ({
        key: category,
        name: strings(`perps.home.tabs.${normalizeFilterKey(category)}`),
        items: applyMarketFilters(markets, {
          categories: [category],
          limit: 3,
        }),
      })),
    [markets],
  );

  if (!perps.isLoading && perps.data.length === 0) return null;

  return (
    <PerpsToggleBlock
      title={strings('trending.rwa_perps_section')}
      tabs={tabs}
      isLoading={perps.isLoading}
      defaultPillKey={RWA_PERPS_CATEGORIES[0]}
      onViewAll={onViewAll}
      sortOptionId={perps.defaultSortOptionId}
      tabName="RWAs"
      sectionName="perps_markets"
      headerTestID="section-header-view-all-rwa_perps"
      idPrefix="rwa_perps"
      testIdPrefix="rwa-perps-pills"
      listTestId="rwa-perps-pill-toggled-list"
    />
  );
};

const RwasTabContent: React.FC<TabProps> = ({
  refresh,
  refreshing,
  onRefresh,
}) => {
  const appNavigation = useNavigation<AppNavigationProp>();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  const [quickTradeToken, setQuickTradeToken] = useState<TrendingAsset | null>(
    null,
  );

  const { variant: quickBuyVariant } = useABTest(
    EXPLORE_QUICK_BUY_AB_KEY,
    EXPLORE_QUICK_BUY_VARIANTS,
    EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
  );

  const politics = usePredictionsFeed({ variant: 'politics', refresh });
  const stocks = useStocksFeed({
    refresh,
    pageSize: STOCKS_FEED_PREVIEW_PAGE_SIZE,
  });
  const rwaPerps = usePerpsFeed({ variant: 'rwa', refresh });

  const renderStockItem: ListRenderItem<TrendingAsset> = useCallback(
    ({ item, index }) => (
      <TokenRowItem
        token={item}
        index={index}
        tokenDetailsSource={TokenDetailsSource.ExploreRwasStocks}
        onCardPress={() =>
          trackExploreInteracted({
            interaction_type: 'section_item_tapped',
            tab_name: 'RWAs',
            section_name: 'stocks',
            asset_type: 'stock',
            position: index,
            token_symbol: item.symbol,
            chain_id: getCaipChainIdFromAssetId(item.assetId),
            item_clicked: item.assetId,
          })
        }
        onQuickTrade={
          quickBuyVariant.showQuickTradeButton ? setQuickTradeToken : undefined
        }
      />
    ),
    [quickBuyVariant.showQuickTradeButton],
  );

  const showStocks = stocks.isLoading || stocks.data.length > 0;
  const showPredictions =
    isPredictEnabled && (politics.isLoading || politics.data.length > 0);
  const showPerps =
    isPerpsEnabled && (rwaPerps.isLoading || rwaPerps.data.length > 0);

  const sections = useMemo((): ExploreSectionItem[] => {
    const items: ExploreSectionItem[] = [];

    if (showPredictions) {
      items.push({
        key: 'predictions',
        content: (
          <PredictionsCarouselSection
            feed={politics}
            tabName="RWAs"
            sectionName="predictions_politics"
            title={strings('trending.predictions')}
            testIdPrefix="predict-rwa-politics-market-row-item"
            idPrefix="politics_predictions"
            onViewAll={() =>
              navigateToExplorePredictionsList(appNavigation, 'politics')
            }
            isEnabled={isPredictEnabled}
          />
        ),
      });
    }

    if (showStocks) {
      items.push({
        key: 'stocks',
        isVerticalList: true,
        content: (
          <>
            <SectionHeader
              title={strings('trending.stocks')}
              onViewAll={() =>
                appNavigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW)
              }
              testID="section-header-view-all-stocks"
              tabName="RWAs"
              sectionName="stocks"
            />
            <CardList<TrendingAsset>
              data={stocks.data}
              isLoading={stocks.isLoading}
              renderItem={renderStockItem}
              Skeleton={TrendingTokensSkeleton}
              idPrefix="stocks"
            />
          </>
        ),
      });
    }

    if (showPerps) {
      items.push({
        key: 'perps',
        isVerticalList: true,
        content: (
          <RwaPerpsBlock
            refresh={refresh}
            onViewAll={(filter, sortOptionId) =>
              navigateToPerpsMarketList(perpsNavigation, filter, sortOptionId)
            }
          />
        ),
      });
    }

    return items;
  }, [
    showPredictions,
    showStocks,
    showPerps,
    politics,
    isPredictEnabled,
    appNavigation,
    stocks.data,
    stocks.isLoading,
    renderStockItem,
    refresh,
    perpsNavigation,
  ]);

  return (
    <View style={styles.container}>
      <ExploreScroll
        refreshing={refreshing}
        onRefresh={onRefresh}
        testID={TrendingViewSelectorsIDs.EXPLORE_RWAS_SCROLL_VIEW}
      >
        <ExploreSectionList sections={sections} />
      </ExploreScroll>

      <TrendingQuickBuy
        token={quickTradeToken}
        onClose={() => setQuickTradeToken(null)}
        source="explore_rwas"
      />
    </View>
  );
};

const RwasTab: React.FC<TabProps> = (props) => (
  <PerpsSectionProvider>
    <RwasTabContent {...props} />
  </PerpsSectionProvider>
);

export default RwasTab;
