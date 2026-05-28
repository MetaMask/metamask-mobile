import React, { useCallback, useMemo } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PredictMarket as PredictMarketType } from '../../UI/Predict/types';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import type { PerpsNavigationParamList } from '../../UI/Perps/types/navigation';
import type { SiteData } from '../../UI/Sites/components/SiteRowItem/SiteRowItem';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPredictEnabledFlag } from '../../UI/Predict';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { TokenDetailsSource } from '../../UI/TokenDetails/constants/constants';
import { useTokensFeed } from './feeds/tokens/useTokensFeed';
import { TokenRowItem } from './feeds/tokens/TokenRowItem';
import TrendingTokensSkeleton from '../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { usePerpsFeed, type PerpsFeedItem } from './feeds/perps/usePerpsFeed';
import PerpsSectionProvider from './feeds/perps/PerpsSectionProvider';
import PerpsTileRowItem from './feeds/perps/PerpsTileRowItem';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import PerpsMarketTileCardSkeleton from '../Homepage/Sections/Perpetuals/components/PerpsMarketTileCardSkeleton';
import { navigateToPerpsMarketList } from './feeds/perps/perpsNavigation';
import { usePredictionsFeed } from './feeds/predictions/usePredictionsFeed';
import { PredictionCarouselRowItem } from './feeds/predictions/PredictionRowItem';
import PredictionsSkeleton from './feeds/predictions/PredictionsSkeleton';
import { navigateToPredictionsList } from './feeds/predictions/predictionsNavigation';
import { useStocksFeed } from './feeds/stocks/useStocksFeed';
import { SiteRowItem } from './feeds/sites/SiteRowItem';
import SiteSkeleton from '../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import { useSitesFeed } from './feeds/sites/useSitesFeed';
import CardList from './components/CardList';
import QuickActions, { type SectionId } from './components/QuickActions';
import ExploreScroll from './components/ExploreScroll';
import HorizontalCarousel from './components/HorizontalCarousel';
import SectionHeader from './components/SectionHeader';
import TileCarousel from './components/TileCarousel';
import type { TabProps } from './hooks/useExploreRefresh';
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';

interface ExploreV1PerpsBlockProps {
  refresh: TabProps['refresh'];
  navigation: NavigationProp<PerpsNavigationParamList>;
}

const ExploreV1PerpsBlock: React.FC<ExploreV1PerpsBlockProps> = ({
  refresh,
  navigation,
}) => {
  const perps = usePerpsFeed({
    variant: 'all',
    refresh,
    withTileExtras: true,
  });

  if (!perps.isLoading && perps.data.length === 0) {
    return null;
  }

  return (
    <Box>
      <SectionHeader
        title={strings('trending.perps')}
        onViewAll={() => navigateToPerpsMarketList(navigation)}
        testID="section-header-view-all-perps"
      />
      <TileCarousel<PerpsFeedItem>
        data={perps.data}
        isLoading={perps.isLoading}
        renderItem={(item) => (
          <PerpsTileRowItem item={item} testIdPrefix="perps-market-tile-card" />
        )}
        keyExtractor={(item) => item.market.symbol}
        Skeleton={PerpsMarketTileCardSkeleton}
        onViewMore={() => navigateToPerpsMarketList(navigation)}
        testID="explore-perps-carousel"
        viewMoreTestID="perps-view-more-card"
      />
    </Box>
  );
};

/**
 * Legacy Explore layout: stacked sections in a single scroll (pre–tabbed Explore V2).
 */
const ExplorePageV1: React.FC<TabProps> = ({
  refresh,
  refreshing,
  onRefresh,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  const predictions = usePredictionsFeed({ refresh });
  const tokens = useTokensFeed({ refresh });
  const stocks = useStocksFeed({ refresh });
  const sites = useSitesFeed({ refresh });

  const renderPredictionItem: ListRenderItem<PredictMarketType> = useCallback(
    ({ item }) => (
      <PredictionCarouselRowItem
        market={item}
        testIdPrefix="predict-market-row-item"
      />
    ),
    [],
  );

  const renderTrendingTokenItem: ListRenderItem<TrendingAsset> = useCallback(
    ({ item, index }) => (
      <TokenRowItem
        token={item}
        index={index}
        tokenDetailsSource={TokenDetailsSource.ExploreCryptoTrending}
      />
    ),
    [],
  );

  const renderStockItem: ListRenderItem<TrendingAsset> = useCallback(
    ({ item, index }) => (
      <TokenRowItem
        token={item}
        index={index}
        tokenDetailsSource={TokenDetailsSource.ExploreNowStocks}
      />
    ),
    [],
  );

  const renderSite: ListRenderItem<SiteData> = useCallback(
    ({ item }) => <SiteRowItem site={item} />,
    [],
  );

  const showPredictions =
    isPredictEnabled && (predictions.isLoading || predictions.data.length > 0);
  const showTrendingTokens = tokens.isLoading || tokens.data.length > 0;
  const showStocks = stocks.isLoading || stocks.data.length > 0;
  const showSites = sites.isLoading || sites.data.length > 0;

  const quickActionsEmptySections = useMemo(() => {
    const empty = new Set<SectionId>();
    if (!showTrendingTokens) {
      empty.add('tokens');
    }
    if (!isPerpsEnabled) {
      empty.add('perps');
    }
    if (!showStocks) {
      empty.add('stocks');
    }
    if (!showPredictions) {
      empty.add('predictions');
    }
    if (!showSites) {
      empty.add('sites');
    }
    return empty;
  }, [
    showTrendingTokens,
    isPerpsEnabled,
    showStocks,
    showPredictions,
    showSites,
  ]);

  return (
    <Box twClassName="flex-1" testID="explore-page-v1">
      <ExploreScroll
        refreshing={refreshing}
        onRefresh={onRefresh}
        testID={TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW}
        includeTopPadding={false}
      >
        <QuickActions emptySections={quickActionsEmptySections} />

        {showPredictions && (
          <Box>
            <SectionHeader
              title={strings('wallet.predict')}
              onViewAll={() =>
                navigateToPredictionsList(navigation, 'trending')
              }
              testID="section-header-view-all-predictions"
            />
            <HorizontalCarousel<PredictMarketType>
              data={predictions.data}
              isLoading={predictions.isLoading}
              renderItem={renderPredictionItem}
              Skeleton={PredictionsSkeleton}
              idPrefix="explore_v1_predictions"
            />
          </Box>
        )}

        {showTrendingTokens && (
          <Box>
            <SectionHeader
              title={strings('trending.trending_tokens')}
              onViewAll={() =>
                navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW)
              }
              testID="section-header-view-all-tokens"
            />
            <CardList<TrendingAsset>
              data={tokens.data}
              isLoading={tokens.isLoading}
              renderItem={renderTrendingTokenItem}
              Skeleton={TrendingTokensSkeleton}
              idPrefix="explore_v1_tokens"
            />
          </Box>
        )}

        {isPerpsEnabled && (
          <PerpsSectionProvider>
            <ExploreV1PerpsBlock
              refresh={refresh}
              navigation={perpsNavigation}
            />
          </PerpsSectionProvider>
        )}

        {showStocks && (
          <Box>
            <SectionHeader
              title={strings('trending.stocks')}
              onViewAll={() =>
                navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW)
              }
              testID="section-header-view-all-stocks"
            />
            <CardList<TrendingAsset>
              data={stocks.data}
              isLoading={stocks.isLoading}
              renderItem={renderStockItem}
              Skeleton={TrendingTokensSkeleton}
              idPrefix="explore_v1_stocks"
            />
          </Box>
        )}

        {showSites && (
          <Box>
            <SectionHeader
              title={strings('trending.sites')}
              onViewAll={() => navigation.navigate(Routes.SITES_FULL_VIEW)}
              testID="section-header-view-all-sites"
            />
            <CardList<SiteData>
              data={sites.data}
              isLoading={sites.isLoading}
              renderItem={renderSite}
              Skeleton={SiteSkeleton}
              idPrefix="explore_v1_sites"
            />
          </Box>
        )}
      </ExploreScroll>
    </Box>
  );
};

export default ExplorePageV1;
