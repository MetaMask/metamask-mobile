import React from 'react';
import type { PredictMarket } from '../../../../../UI/Predict/types';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import type { UseHomepagePredictTaggedMarketsResult } from '../hooks/useHomepagePredictTaggedMarkets';
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
  worldCupHomepage?: UseHomepagePredictTaggedMarketsResult;
  /** Required when `discoveryLayout` is `list` (NBA champion event, separate from World Cup tag). */
  nbaChampionHomepage?: UseHomepagePredictTaggedMarketsResult;
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
  nbaChampionHomepage,
  emptyStateTransactionActiveAbTests,
  onEmptyStateTreatmentCtaClick,
}: HomepagePredictTrendingMarketsProps) =>
  discoveryLayout === 'carousel' ? (
    <HomepagePredictTrendingCarousel
      title={title}
      onViewAll={onViewAll}
      headerTestIdKey={headerTestIdKey}
      isLoadingMarkets={isLoadingMarkets}
      markets={markets}
      transactionActiveAbTests={transactionActiveAbTests}
    />
  ) : (
    <HomepagePredictWorldCupDiscovery
      title={title}
      onViewAll={onViewAll}
      headerTestIdKey={headerTestIdKey}
      worldCup={worldCupHomepage as UseHomepagePredictTaggedMarketsResult}
      nbaChampion={nbaChampionHomepage as UseHomepagePredictTaggedMarketsResult}
      transactionActiveAbTests={emptyStateTransactionActiveAbTests}
      onTreatmentCtaClick={onEmptyStateTreatmentCtaClick}
    />
  );

export default HomepagePredictTrendingMarkets;
