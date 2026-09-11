import React, { type ReactNode } from 'react';
import type { PredictMarket } from '../../../../../UI/Predict/types';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import type { PredictionsTrendingHeaderTestId } from '../predictionsSectionTypes';
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
  discoveryList?: ReactNode;
}

const HomepagePredictTrendingMarkets = ({
  title,
  onViewAll,
  headerTestIdKey,
  discoveryLayout,
  isLoadingMarkets,
  markets,
  transactionActiveAbTests,
  discoveryList,
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

  return discoveryList ?? null;
};

export default HomepagePredictTrendingMarkets;
