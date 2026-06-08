import React, { useMemo } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { PerpsMarketData, SortOptionId } from '@metamask/perps-controller';
import { isEquityAsset } from '../../../UI/Perps/utils/marketHours';
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
import { navigateToExplorePredictionsList } from '../feeds/predictions/predictionsNavigation';
import ExploreScroll from '../components/ExploreScroll';
import type { PillToggleCardListTab } from '../components/PillToggleCardList';
import type { TabProps } from '../hooks/useExploreRefresh';

interface MacroPerpsBlockProps {
  refresh: TabProps['refresh'];
  onViewAll: (filter: string, sortOptionId: SortOptionId) => void;
  showDivider?: boolean;
  addSectionTailGap?: boolean;
}

const MacroPerpsBlock: React.FC<MacroPerpsBlockProps> = ({
  refresh,
  onViewAll,
  showDivider,
  addSectionTailGap,
}) => {
  const perps = usePerpsFeed({ variant: 'macro', refresh });

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
        key: 'stocks',
        name: strings('trending.macro_pill_stocks'),
        items: stockLikeItems,
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
      showDivider={showDivider}
      addSectionTailGap={addSectionTailGap}
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

  const sectionLayout = useMemo(() => {
    const sections: Array<{ key: string; isVerticalList: boolean }> = [];
    if (showPredictions) {
      sections.push({ key: 'predictions', isVerticalList: false });
    }
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
  }, [showPredictions, showPerps]);

  return (
    <ExploreScroll refreshing={refreshing} onRefresh={onRefresh}>
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
        {...sectionLayout('predictions')}
      />

      {isPerpsEnabled && (
        <MacroPerpsBlock
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

const MacroTab: React.FC<TabProps> = (props) => (
  <PerpsSectionProvider>
    <MacroTabContent {...props} />
  </PerpsSectionProvider>
);

export default MacroTab;
