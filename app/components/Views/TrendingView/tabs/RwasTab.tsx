import React, { useCallback, useMemo } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { TokenRowItem } from '../feeds/tokens/TokenRowItem';
import TrendingTokensSkeleton from '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { useStocksFeed } from '../feeds/stocks/useStocksFeed';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import PerpsSectionProvider from '../feeds/perps/PerpsSectionProvider';
import PerpsRowItem from '../feeds/perps/PerpsRowItem';
import PerpsRowSkeleton from '../../../UI/Perps/components/PerpsRowSkeleton';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import { PredictionCarouselRowItem } from '../feeds/predictions/PredictionRowItem';
import PredictionsSkeleton from '../feeds/predictions/PredictionsSkeleton';
import { navigateToPredictionsList } from '../feeds/predictions/predictionsNavigation';
import CardList from '../components/CardList';
import ExploreScroll from '../components/ExploreScroll';
import HorizontalCarousel from '../components/HorizontalCarousel';
import PillToggleCardList, {
  type PillToggleCardListTab,
} from '../components/PillToggleCardList';
import SectionHeader from '../components/SectionHeader';
import type { TabProps } from '../hooks/useExploreRefresh';

const PerpsRowSingleSkeleton: React.FC = () => <PerpsRowSkeleton count={1} />;

interface RwaPerpsBlockProps {
  refresh: TabProps['refresh'];
  onViewAll: () => void;
}

const RwaPerpsBlock: React.FC<RwaPerpsBlockProps> = ({
  refresh,
  onViewAll,
}) => {
  const perps = usePerpsFeed({ variant: 'rwa', refresh });

  const tabs = useMemo<PillToggleCardListTab<PerpsMarketData>[]>(() => {
    const byType = (type: PerpsMarketData['marketType']) =>
      perps.data
        .filter((d) => d.market.marketType === type)
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
        items: byType('equity'),
      },
      {
        key: 'forex',
        name: strings('trending.rwa_pill_forex'),
        items: byType('forex'),
      },
    ];
  }, [perps.data]);

  const renderItem: ListRenderItem<PerpsMarketData> = useCallback(
    ({ item }) => <PerpsRowItem market={item} />,
    [],
  );

  if (!perps.isLoading && perps.data.length === 0) return null;

  return (
    <Box>
      <SectionHeader
        title={strings('trending.rwa_perps_section')}
        onViewAll={onViewAll}
        testID="section-header-view-all-rwa_perps"
      />
      <PillToggleCardList<PerpsMarketData>
        tabs={tabs}
        isLoading={perps.isLoading}
        renderItem={renderItem}
        Skeleton={PerpsRowSingleSkeleton}
        idPrefix="rwa_perps"
        testIdPrefix="rwa-perps-pills"
        listTestId="rwa-perps-pill-toggled-list"
      />
    </Box>
  );
};

const RwasTab: React.FC<TabProps> = ({ refresh, refreshing, onRefresh }) => {
  const appNavigation = useNavigation<AppNavigationProp>();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  const politics = usePredictionsFeed({ variant: 'politics', refresh });
  const stocks = useStocksFeed({ refresh });

  const renderPredictionItem: ListRenderItem<PredictMarketType> = useCallback(
    ({ item }) => (
      <PredictionCarouselRowItem
        market={item}
        testIdPrefix="predict-rwa-politics-market-row-item"
      />
    ),
    [],
  );

  const renderStockItem: ListRenderItem<TrendingAsset> = useCallback(
    ({ item, index }) => <TokenRowItem token={item} index={index} />,
    [],
  );

  const showPolitics =
    isPredictEnabled && (politics.isLoading || politics.data.length > 0);
  const showStocks = stocks.isLoading || stocks.data.length > 0;

  return (
    <ExploreScroll refreshing={refreshing} onRefresh={onRefresh}>
      {showPolitics && (
        <Box>
          <SectionHeader
            title={strings('trending.predictions')}
            onViewAll={() =>
              navigateToPredictionsList(appNavigation, 'politics')
            }
            testID="section-header-view-all-politics_predictions"
          />
          <HorizontalCarousel<PredictMarketType>
            data={politics.data}
            isLoading={politics.isLoading}
            renderItem={renderPredictionItem}
            Skeleton={PredictionsSkeleton}
            idPrefix="politics_predictions"
          />
        </Box>
      )}

      {showStocks && (
        <Box>
          <SectionHeader
            title={strings('trending.stocks')}
            onViewAll={() =>
              appNavigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW)
            }
            testID="section-header-view-all-stocks"
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
        <PerpsSectionProvider>
          <RwaPerpsBlock
            refresh={refresh}
            onViewAll={() => navigateToPerpsMarketList(perpsNavigation)}
          />
        </PerpsSectionProvider>
      )}
    </ExploreScroll>
  );
};

export default RwasTab;
