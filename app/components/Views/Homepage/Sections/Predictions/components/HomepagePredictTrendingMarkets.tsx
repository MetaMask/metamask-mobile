import React from 'react';
import type { PredictMarket } from '../../../../../UI/Predict/types';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import type { UseHomepagePredictWorldCupMarketsResult } from '../hooks/useHomepagePredictWorldCupMarkets';
import type { PredictionsTrendingHeaderTestId } from '../predictionsSectionTypes';
import type { PredictEmptyStateCtaName } from '../../../abTestConfig';
import HomepagePredictWorldCupDiscovery from './HomepagePredictWorldCupDiscovery';
import HomepagePredictTrendingCarousel from './HomepagePredictTrendingCarousel';

export interface HomepagePredictTrendingMarketsProps {
  title: string;
  onViewAll: (
    transactionActiveAbTests?: TransactionActiveAbTestEntry[],
  ) => void;
  headerTestIdKey: PredictionsTrendingHeaderTestId;
  discoveryLayout: 'carousel' | 'list';
  isLoadingMarkets: boolean;
  markets: PredictMarket[];
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  /** Required when `discoveryLayout` is `list` (World Cup discovery rail). */
  worldCupHomepage?: UseHomepagePredictWorldCupMarketsResult;
  /** Required when `discoveryLayout` is `list` (World Cup live games rail item). */
  liveWorldCupHomepage?: UseHomepagePredictWorldCupMarketsResult;
  worldCupEventCount?: number;
  emptyStateTransactionActiveAbTests?: TransactionActiveAbTestEntry[];
  onEmptyStateTreatmentCtaClick?: (
    ctaName: PredictEmptyStateCtaName,
    categoryName?: string,
  ) => void;
}

const HomepagePredictTrendingMarkets = ({
  title,
  onViewAll,
  headerTestIdKey,
  discoveryLayout,
  isLoadingMarkets,
  markets,
  transactionActiveAbTests,
  worldCupHomepage,
  liveWorldCupHomepage,
  worldCupEventCount,
  emptyStateTransactionActiveAbTests,
  onEmptyStateTreatmentCtaClick,
}: HomepagePredictTrendingMarketsProps) => {
  if (discoveryLayout === 'carousel') {
    return (
      <HomepagePredictTrendingCarousel
        title={title}
        onViewAll={onViewAll}
        headerTestIdKey={headerTestIdKey}
        isLoadingMarkets={isLoadingMarkets}
        markets={markets}
        transactionActiveAbTests={transactionActiveAbTests}
      />
    );
  }

  if (!worldCupHomepage || !liveWorldCupHomepage) {
    return null;
  }

  return (
    <HomepagePredictWorldCupDiscovery
      title={title}
      onViewAll={onViewAll}
      headerTestIdKey={headerTestIdKey}
      worldCup={worldCupHomepage}
      liveWorldCup={liveWorldCupHomepage}
      worldCupEventCount={worldCupEventCount}
      transactionActiveAbTests={emptyStateTransactionActiveAbTests}
      onTreatmentCtaClick={onEmptyStateTreatmentCtaClick}
    />
  );
};

export default HomepagePredictTrendingMarkets;
