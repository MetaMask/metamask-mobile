import React, { useMemo } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { PerpsMarketData, SortOptionId } from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import { strings } from '../../../../../locales/i18n';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import PerpsSectionProvider from '../feeds/perps/PerpsSectionProvider';
import PerpsToggleBlock from '../feeds/perps/PerpsToggleBlock';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import PredictionsCarouselSection from '../feeds/predictions/PredictionsCarouselSection';
import { navigateToPredictionsList } from '../feeds/predictions/predictionsNavigation';
import ExploreScroll from '../components/ExploreScroll';
import type { PillToggleCardListTab } from '../components/PillToggleCardList';
import type { TabProps } from '../hooks/useExploreRefresh';

interface MacroPerpsBlockProps {
  refresh: TabProps['refresh'];
  onViewAll: (filter: string, sortOptionId: SortOptionId) => void;
}

const MacroPerpsBlock: React.FC<MacroPerpsBlockProps> = ({
  refresh,
  onViewAll,
}) => {
  const perps = usePerpsFeed({ variant: 'macro', refresh });

  const tabs = useMemo<PillToggleCardListTab<PerpsMarketData>[]>(() => {
    const byType = (type: PerpsMarketData['marketType']) =>
      perps.data
        .filter((d) => d.market.marketType === type)
        .slice(0, 3)
        .map((d) => d.market);
    return [
      {
        key: 'stocks',
        name: strings('trending.macro_pill_stocks'),
        items: byType('equity'),
      },
      {
        key: 'commodities',
        name: strings('trending.macro_pill_commodities'),
        items: byType('commodity'),
      },
    ];
  }, [perps.data]);

  if (!perps.isLoading && perps.data.length === 0) return null;

  return (
    <PerpsToggleBlock
      title={strings('trending.macro_stocks_commodity_perps')}
      tabs={tabs}
      isLoading={perps.isLoading}
      defaultPillKey="stocks"
      onViewAll={onViewAll}
      sortOptionId={perps.defaultSortOptionId}
      tabName="Macro"
      sectionName="perps_stocks_commodities"
      headerTestID="section-header-view-all-macro_stocks_commodity_perps"
      idPrefix="macro_stocks_commodity_perps"
      testIdPrefix="macro-stocks-commodity-pills"
      listTestId="macro-stocks-commodity-perps-list"
    />
  );
};

const MacroTab: React.FC<TabProps> = ({ refresh, refreshing, onRefresh }) => {
  const appNavigation = useNavigation<AppNavigationProp>();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  const politics = usePredictionsFeed({ variant: 'politics', refresh });

  return (
    <ExploreScroll refreshing={refreshing} onRefresh={onRefresh}>
      <PredictionsCarouselSection
        feed={politics}
        tabName="Macro"
        sectionName="predictions_politics"
        title={strings('trending.predictions')}
        testIdPrefix="predict-rwa-politics-market-row-item"
        idPrefix="politics_predictions"
        onViewAll={() => navigateToPredictionsList(appNavigation, 'politics')}
        isEnabled={isPredictEnabled}
      />

      {isPerpsEnabled && (
        <PerpsSectionProvider>
          <MacroPerpsBlock
            refresh={refresh}
            onViewAll={(filter, sortOptionId) =>
              navigateToPerpsMarketList(perpsNavigation, filter, sortOptionId)
            }
          />
        </PerpsSectionProvider>
      )}
    </ExploreScroll>
  );
};

export default MacroTab;
