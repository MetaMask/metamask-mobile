import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../../component-library/components-temp/SectionHeader';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../../Wallet/WalletView.testIds';
import type { PredictMarket } from '../../../../../UI/Predict/types';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import ViewMoreCard from '../../../components/ViewMoreCard';
import { MAX_MARKETS_DISPLAYED } from '../predictionsSectionConstants';
import type { PredictionsTrendingHeaderTestId } from '../predictionsSectionTypes';
import PredictMarketCard from './PredictMarketCard';
import PredictMarketCardSkeleton from './PredictMarketCardSkeleton';

const CAROUSEL_SKELETON_KEYS = Array.from(
  { length: MAX_MARKETS_DISPLAYED },
  (_, i) => `predict-home-carousel-skeleton-${i}`,
);

export interface HomepagePredictTrendingCarouselProps {
  title: string;
  onViewAll: (
    transactionActiveAbTests?: TransactionActiveAbTestEntry[],
  ) => void;
  headerTestIdKey: PredictionsTrendingHeaderTestId;
  isLoadingMarkets: boolean;
  markets: PredictMarket[];
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

/** Control: horizontal trending markets carousel + view more. */
const HomepagePredictTrendingCarousel = ({
  title,
  onViewAll,
  headerTestIdKey,
  isLoadingMarkets,
  markets,
  transactionActiveAbTests,
}: HomepagePredictTrendingCarouselProps) => {
  const tw = useTailwind();
  const handleViewAll = useCallback(() => {
    onViewAll(transactionActiveAbTests);
  }, [onViewAll, transactionActiveAbTests]);

  return (
    <Box gap={3}>
      <SectionHeader
        title={title}
        onPress={handleViewAll}
        testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE(headerTestIdKey)}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-3')}
      >
        {isLoadingMarkets ? (
          CAROUSEL_SKELETON_KEYS.map((key) => (
            <PredictMarketCardSkeleton key={key} />
          ))
        ) : (
          <>
            {markets.map((market) => (
              <PredictMarketCard
                key={market.id}
                market={market}
                transactionActiveAbTests={transactionActiveAbTests}
              />
            ))}
            <ViewMoreCard
              onPress={handleViewAll}
              twClassName="w-[180px] flex-1"
            />
          </>
        )}
      </ScrollView>
    </Box>
  );
};

export default HomepagePredictTrendingCarousel;
