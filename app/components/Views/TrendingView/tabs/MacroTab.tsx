import React, { useCallback, useMemo } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import { strings } from '../../../../../locales/i18n';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import PerpsSectionProvider from '../feeds/perps/PerpsSectionProvider';
import PerpsRowItem from '../feeds/perps/PerpsRowItem';
import PerpsRowSkeleton from '../../../UI/Perps/components/PerpsRowSkeleton';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import { PredictionCarouselRowItem } from '../feeds/predictions/PredictionRowItem';
import PredictionsSkeleton from '../feeds/predictions/PredictionsSkeleton';
import { navigateToPredictionsList } from '../feeds/predictions/predictionsNavigation';
import ExploreScroll from '../components/ExploreScroll';
import HorizontalCarousel from '../components/HorizontalCarousel';
import PillToggleCardList, {
  type PillToggleCardListTab,
} from '../components/PillToggleCardList';
import SectionHeader from '../components/SectionHeader';
import type { TabProps } from '../hooks/useExploreRefresh';

const PerpsRowSingleSkeleton: React.FC = () => <PerpsRowSkeleton count={1} />;

interface MacroPerpsBlockProps {
  refresh: TabProps['refresh'];
  onViewAll: () => void;
}

const MacroPerpsBlock: React.FC<MacroPerpsBlockProps> = ({
  refresh,
  onViewAll,
}) => {
  const perps = usePerpsFeed({ variant: 'macro', refresh });

  const tabs = useMemo<PillToggleCardListTab<PerpsMarketData>[]>(() => {
    const stocks = perps.data
      .filter((d) => d.market.marketType === 'equity')
      .slice(0, 3)
      .map((d) => d.market);
    const commodities = perps.data
      .filter((d) => d.market.marketType === 'commodity')
      .slice(0, 3)
      .map((d) => d.market);
    return [
      {
        key: 'stocks',
        name: strings('trending.macro_pill_stocks'),
        items: stocks,
      },
      {
        key: 'commodities',
        name: strings('trending.macro_pill_commodities'),
        items: commodities,
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
        title={strings('trending.macro_stocks_commodity_perps')}
        onViewAll={onViewAll}
        testID="section-header-view-all-macro_stocks_commodity_perps"
      />
      <PillToggleCardList<PerpsMarketData>
        tabs={tabs}
        isLoading={perps.isLoading}
        renderItem={renderItem}
        Skeleton={PerpsRowSingleSkeleton}
        idPrefix="macro_stocks_commodity_perps"
        testIdPrefix="macro-stocks-commodity-pills"
        listTestId="macro-stocks-commodity-perps-list"
      />
    </Box>
  );
};

const MacroTab: React.FC<TabProps> = ({ refresh, refreshing, onRefresh }) => {
  const appNavigation = useNavigation<AppNavigationProp>();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  const politics = usePredictionsFeed({ variant: 'politics', refresh });

  const renderPredictionItem: ListRenderItem<PredictMarketType> = useCallback(
    ({ item }) => (
      <PredictionCarouselRowItem
        market={item}
        testIdPrefix="predict-rwa-politics-market-row-item"
      />
    ),
    [],
  );

  const showPolitics =
    isPredictEnabled && (politics.isLoading || politics.data.length > 0);

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

      {isPerpsEnabled && (
        <PerpsSectionProvider>
          <MacroPerpsBlock
            refresh={refresh}
            onViewAll={() => navigateToPerpsMarketList(perpsNavigation)}
          />
        </PerpsSectionProvider>
      )}
    </ExploreScroll>
  );
};

export default MacroTab;
