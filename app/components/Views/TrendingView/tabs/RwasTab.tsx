import React, { useCallback, useMemo } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData, SortOptionId } from '@metamask/perps-controller';
import { isEquityAsset } from '../../../UI/Perps/utils/marketHours';
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
import PerpsToggleBlock from '../feeds/perps/PerpsToggleBlock';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import PredictionsCarouselSection from '../feeds/predictions/PredictionsCarouselSection';
import { navigateToExplorePredictionsList } from '../feeds/predictions/predictionsNavigation';
import CardList from '../components/CardList';
import ExploreScroll from '../components/ExploreScroll';
import SectionHeader from '../components/SectionHeader';
import type { PillToggleCardListTab } from '../components/PillToggleCardList';
import type { TabProps } from '../hooks/useExploreRefresh';
import { trackExploreInteracted } from '../search/analytics';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';

interface RwaPerpsBlockProps {
  refresh: TabProps['refresh'];
  onViewAll: (filter: string, sortOptionId: SortOptionId) => void;
  showDivider?: boolean;
  addSectionTailGap?: boolean;
}

const RwaPerpsBlock: React.FC<RwaPerpsBlockProps> = ({
  refresh,
  onViewAll,
  showDivider,
  addSectionTailGap,
}) => {
  const perps = usePerpsFeed({ variant: 'rwa', refresh });

  const tabs = useMemo<PillToggleCardListTab<PerpsMarketData>[]>(() => {
    const byType = (type: PerpsMarketData['marketType']) =>
      perps.data
        .filter((d) => d.market.marketType === type)
        .slice(0, 3)
        .map((d) => d.market);
    const stockLikeItems = perps.data
      .filter((d) => isEquityAsset(d.market.marketType))
      .slice(0, 3)
      .map((d) => d.market);
    return [
      {
        key: 'commodities',
        name: strings('trending.rwa_pill_commodities'),
        items: byType('commodity'),
      },
      {
        key: 'stocks',
        name: strings('trending.rwa_pill_stocks'),
        items: stockLikeItems,
      },
      {
        key: 'forex',
        name: strings('trending.rwa_pill_forex'),
        items: byType('forex'),
      },
    ];
  }, [perps.data]);

  if (!perps.isLoading && perps.data.length === 0) return null;

  return (
    <PerpsToggleBlock
      title={strings('trending.rwa_perps_section')}
      tabs={tabs}
      isLoading={perps.isLoading}
      defaultPillKey="commodities"
      onViewAll={onViewAll}
      sortOptionId={perps.defaultSortOptionId}
      tabName="RWAs"
      sectionName="perps_markets"
      headerTestID="section-header-view-all-rwa_perps"
      idPrefix="rwa_perps"
      testIdPrefix="rwa-perps-pills"
      listTestId="rwa-perps-pill-toggled-list"
      showDivider={showDivider}
      addSectionTailGap={addSectionTailGap}
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
      />
    ),
    [],
  );

  const showStocks = stocks.isLoading || stocks.data.length > 0;
  const showPredictions =
    isPredictEnabled && (politics.isLoading || politics.data.length > 0);
  const showPerps =
    isPerpsEnabled && (rwaPerps.isLoading || rwaPerps.data.length > 0);

  const sectionLayout = useMemo(() => {
    const sections: { key: string; isVerticalList: boolean }[] = [];
    if (showPredictions) {
      sections.push({ key: 'predictions', isVerticalList: false });
    }
    if (showStocks) sections.push({ key: 'stocks', isVerticalList: true });
    if (showPerps) sections.push({ key: 'perps', isVerticalList: true });

    return (key: string) => {
      const index = sections.findIndex((section) => section.key === key);
      if (index === -1) {
        return { showDivider: false, addSectionTailGap: false };
      }
      const { isVerticalList } = sections[index];
      return {
        showDivider: index > 0,
        addSectionTailGap: index < sections.length - 1 && !isVerticalList,
      };
    };
  }, [showPredictions, showStocks, showPerps]);

  return (
    <ExploreScroll
      refreshing={refreshing}
      onRefresh={onRefresh}
      testID={TrendingViewSelectorsIDs.EXPLORE_RWAS_SCROLL_VIEW}
    >
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
        {...sectionLayout('predictions')}
      />

      {showStocks && (
        <Box>
          {sectionLayout('stocks').showDivider ? (
            <SectionDivider twClassName="-mx-4" />
          ) : null}
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
        </Box>
      )}

      {isPerpsEnabled && (
        <RwaPerpsBlock
          refresh={refresh}
          onViewAll={(filter, sortOptionId) =>
            navigateToPerpsMarketList(perpsNavigation, filter, sortOptionId)
          }
          {...sectionLayout('perps')}
        />
      )}
    </ExploreScroll>
  );
};

const RwasTab: React.FC<TabProps> = (props) => (
  <PerpsSectionProvider>
    <RwasTabContent {...props} />
  </PerpsSectionProvider>
);

export default RwasTab;
