import React, { useMemo } from 'react';
import {
  Box,
  IconName as DSIconName,
} from '@metamask/design-system-react-native';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import PredictMarket from '../../../UI/Predict/components/PredictMarket';
import PredictMarketRowItem from '../../../UI/Predict/components/PredictMarketRowItem';
import PredictMarketSkeleton from '../../../UI/Predict/components/PredictMarketSkeleton';
import SiteSkeleton from '../../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import SectionCarrousel from '../components/Sections/SectionTypes/SectionCarrousel';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { fuseSearch, PREDICTIONS_FUSE_OPTIONS } from './search-utils';
import type { SectionConfig, SectionId } from './types';

type PredictCategory = 'trending' | 'sports' | 'crypto' | 'politics';

const makePredictionsSection = ({
  id,
  titleKey,
  category,
  testIdPrefix,
  tab,
}: {
  id: SectionId;
  titleKey: string;
  category: PredictCategory;
  testIdPrefix: string;
  tab?: string;
}): SectionConfig => ({
  id,
  title: strings(titleKey),
  icon: { source: 'design-system', name: DSIconName.Speedometer },
  viewAllAction: (navigation) => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: tab ? { tab } : undefined,
    });
  },
  getItemIdentifier: (item) => (item as Partial<PredictMarketType>).id ?? '',
  RowItem: ({ item }) => (
    <Box twClassName="py-2">
      <PredictMarket
        market={item as PredictMarketType}
        isCarousel
        testID={`${testIdPrefix}-${(item as PredictMarketType).id}`}
      />
    </Box>
  ),
  OverrideRowItemSearch: ({ item }) => (
    <PredictMarketRowItem market={item as PredictMarketType} />
  ),
  Skeleton: () => <PredictMarketSkeleton isCarousel />,
  // PredictMarketSkeleton has too much spacing in search context
  OverrideSkeletonSearch: SiteSkeleton,
  Section: SectionCarrousel,
  useSectionData: (searchQuery) => {
    const { marketData, isFetching, refetch } = usePredictMarketData({
      category,
      pageSize: searchQuery ? 20 : 6,
      q: searchQuery || undefined,
    });
    const filteredData = useMemo(
      () => fuseSearch(marketData, searchQuery, PREDICTIONS_FUSE_OPTIONS),
      [marketData, searchQuery],
    );
    return { data: filteredData, isLoading: isFetching, refetch };
  },
});

export const predictionsSections = {
  predictions: makePredictionsSection({
    id: 'predictions',
    titleKey: 'wallet.predict',
    category: 'trending',
    testIdPrefix: 'predict-market-row-item',
  }),
  sports_predictions: makePredictionsSection({
    id: 'sports_predictions',
    titleKey: 'predict.category.sports',
    category: 'sports',
    testIdPrefix: 'predict-sports-market-row-item',
    tab: 'sports',
  }),
  crypto_predictions: makePredictionsSection({
    id: 'crypto_predictions',
    titleKey: 'predict.category.crypto',
    category: 'crypto',
    testIdPrefix: 'predict-crypto-market-row-item',
    tab: 'crypto',
  }),
  politics_predictions: makePredictionsSection({
    id: 'politics_predictions',
    titleKey: 'predict.category.politics',
    category: 'politics',
    testIdPrefix: 'predict-rwa-politics-market-row-item',
    tab: 'politics',
  }),
};
