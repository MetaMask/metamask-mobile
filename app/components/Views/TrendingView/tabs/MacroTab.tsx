import React, { useMemo } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  applyMarketFilters,
  type PerpsMarketData,
  type SortOptionId,
} from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import { normalizeFilterKey } from '../../../UI/Perps/utils/marketCategoryMapping';
import { strings } from '../../../../../locales/i18n';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import PerpsSectionProvider from '../feeds/perps/PerpsSectionProvider';
import PerpsToggleBlock, {
  type PerpsFilterKey,
} from '../feeds/perps/PerpsToggleBlock';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import PredictionsCarouselSection from '../feeds/predictions/PredictionsCarouselSection';
import { navigateToExplorePredictionsList } from '../feeds/predictions/predictionsNavigation';
import ExploreScroll from '../components/ExploreScroll';
import ExploreSectionList, {
  type ExploreSectionItem,
} from '../components/ExploreSectionList';
import type { PillToggleCardListTab } from '../components/PillToggleCardList';
import type { TabProps } from '../hooks/useExploreRefresh';

/** Perps category pills for the Macro tab, in perps display order. */
const MACRO_PERPS_CATEGORIES: PerpsFilterKey[] = [
  'stock',
  'pre-ipo',
  'commodity',
  'index',
  'etf',
];

interface MacroPerpsBlockProps {
  refresh: TabProps['refresh'];
  onViewAll: (filter: PerpsFilterKey, sortOptionId: SortOptionId) => void;
}

const MacroPerpsBlock: React.FC<MacroPerpsBlockProps> = ({
  refresh,
  onViewAll,
}) => {
  const perps = usePerpsFeed({ variant: 'macro', refresh });
  const markets = useMemo(() => perps.data.map((d) => d.market), [perps.data]);

  const tabs = useMemo<PillToggleCardListTab<PerpsMarketData>[]>(
    () =>
      MACRO_PERPS_CATEGORIES.map((category) => ({
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
      title={strings('trending.macro_stocks_commodity_perps')}
      tabs={tabs}
      isLoading={perps.isLoading}
      defaultPillKey={MACRO_PERPS_CATEGORIES[0]}
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

const MacroTabContent: React.FC<TabProps> = ({
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
  const macroPerps = usePerpsFeed({ variant: 'macro', refresh });

  const showPredictions =
    isPredictEnabled && (politics.isLoading || politics.data.length > 0);
  const showPerps =
    isPerpsEnabled && (macroPerps.isLoading || macroPerps.data.length > 0);

  const sections = useMemo((): ExploreSectionItem[] => {
    const items: ExploreSectionItem[] = [];

    if (showPredictions) {
      items.push({
        key: 'predictions',
        content: (
          <PredictionsCarouselSection
            feed={politics}
            tabName="Macro"
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

    if (showPerps) {
      items.push({
        key: 'perps',
        isVerticalList: true,
        content: (
          <MacroPerpsBlock
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
    showPerps,
    politics,
    isPredictEnabled,
    appNavigation,
    refresh,
    perpsNavigation,
  ]);

  return (
    <ExploreScroll refreshing={refreshing} onRefresh={onRefresh}>
      <ExploreSectionList sections={sections} />
    </ExploreScroll>
  );
};

const MacroTab: React.FC<TabProps> = (props) => (
  <PerpsSectionProvider>
    <MacroTabContent {...props} />
  </PerpsSectionProvider>
);

export default MacroTab;
