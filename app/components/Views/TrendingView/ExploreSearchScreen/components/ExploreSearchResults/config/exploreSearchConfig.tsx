import React from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import TrendingTokenRowItem from '../../../../TrendingTokensSection/TrendingTokensList/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../../../TrendingTokensSection/TrendingTokenSkeleton/TrendingTokensSkeleton';
import PerpsMarketRowItem from '../../../../../../UI/Perps/components/PerpsMarketRowItem';
import PerpsMarketRowSkeleton from '../../../../../../UI/Perps/Views/PerpsMarketListView/components/PerpsMarketRowSkeleton';
import type { PerpsMarketData } from '../../../../../../UI/Perps/controllers/types';
import PredictMarket from '../../../../../../UI/Predict/components/PredictMarket';
import type { PredictMarket as PredictMarketType } from '../../../../../../UI/Predict/types';
import type { PerpsNavigationParamList } from '../../../../../../UI/Perps/types/navigation';
import Routes from '../../../../../../../constants/navigation/Routes';
import PredictMarketSkeleton from '../../../../../../UI/Predict/components/PredictMarketSkeleton';

export type SectionId = 'tokens' | 'perps' | 'predictions';

export interface SectionData {
  data: unknown[];
  isLoading: boolean;
}

interface SearchSectionConfig<T, N extends ParamListBase = ParamListBase> {
  id: SectionId;
  title: string;
  renderItem: (item: T, onPress?: (item: T) => void) => JSX.Element;
  renderSkeleton: () => JSX.Element;
  getSearchableText: (item: T) => string;
  keyExtractor: (item: T) => string;
  getOnPressHandler?: (navigation: NavigationProp<N>) => (item: T) => void;
}

// Token section configuration
const tokensConfig: SearchSectionConfig<TrendingAsset> = {
  id: 'tokens',
  title: 'Tokens',
  renderItem: (item) => (
    <TrendingTokenRowItem token={item} onPress={() => undefined} />
  ),
  renderSkeleton: () => <TrendingTokensSkeleton />,
  getSearchableText: (item) => `${item.symbol} ${item.name}`.toLowerCase(),
  keyExtractor: (item) => `token-${item.assetId}`,
};

// Perps section configuration
const perpsConfig: SearchSectionConfig<
  PerpsMarketData,
  PerpsNavigationParamList
> = {
  id: 'perps',
  title: 'Perps',
  renderItem: (item, onPress) => (
    <PerpsMarketRowItem
      market={item}
      onPress={() => onPress?.(item)}
      showBadge={false}
    />
  ),
  renderSkeleton: () => <PerpsMarketRowSkeleton />,
  getSearchableText: (item) =>
    `${item.symbol} ${item.name || ''}`.toLowerCase(),
  keyExtractor: (item) => `perp-${item.symbol}`,
  getOnPressHandler:
    (navigation: NavigationProp<PerpsNavigationParamList>) =>
    (market: PerpsMarketData) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market },
      });
    },
};

// Predictions section configuration
const predictionsConfig: SearchSectionConfig<PredictMarketType> = {
  id: 'predictions',
  title: 'Predictions',
  renderItem: (item) => <PredictMarket market={item} />,
  renderSkeleton: () => <PredictMarketSkeleton />,
  getSearchableText: (item) => item.title.toLowerCase(),
  keyExtractor: (item) => `prediction-${item.id}`,
};

export const SEARCH_SECTION_ARRAY = [
  tokensConfig,
  perpsConfig,
  predictionsConfig,
];
