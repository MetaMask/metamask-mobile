import React from 'react';
import type { PredictMarket } from '../../../../../UI/Predict/types';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import type { UseHomepagePredictMarketSlotsResult } from '../hooks/useHomepagePredictMarketSlots';
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
  /** Required when `discoveryLayout` is `list`. */
  marketSlots?: UseHomepagePredictMarketSlotsResult;
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
  marketSlots,
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

  if (!marketSlots) {
    return null;
  }

  return (
    <HomepagePredictWorldCupDiscovery
      title={title}
      onViewAll={onViewAll}
      headerTestIdKey={headerTestIdKey}
      marketSlots={marketSlots}
      transactionActiveAbTests={emptyStateTransactionActiveAbTests}
      onTreatmentCtaClick={onEmptyStateTreatmentCtaClick}
    />
  );
};

export default HomepagePredictTrendingMarkets;
