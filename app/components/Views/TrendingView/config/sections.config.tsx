import React from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import TrendingTokenRowItem from '../TrendingTokensSection/TrendingTokensList/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../TrendingTokensSection/TrendingTokenSkeleton/TrendingTokensSkeleton';
import PerpsMarketRowItem from '../../../UI/Perps/components/PerpsMarketRowItem';
import PerpsMarketRowSkeleton from '../../../UI/Perps/Views/PerpsMarketListView/components/PerpsMarketRowSkeleton';
import type { PerpsMarketData } from '../../../UI/Perps/controllers/types';
import PredictMarket from '../../../UI/Predict/components/PredictMarket';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import PredictMarketSkeleton from '../../../UI/Predict/components/PredictMarketSkeleton';

export type SectionId = 'predictions' | 'tokens' | 'perps';

export interface SectionData {
  data: unknown[];
  isLoading: boolean;
}

/**
 * Configuration for each section in the Trending View.
 * This includes navigation, display, and search functionality.
 */
export interface SectionConfig {
  title: string;
  navigationAction: (navigation: NavigationProp<ParamListBase>) => void;
  renderItem: (item: unknown, onPress?: (item: unknown) => void) => JSX.Element;
  renderSkeleton: () => JSX.Element;
  getSearchableText: (item: unknown) => string;
  keyExtractor: (item: unknown) => string;
  getOnPressHandler?: (
    navigation: NavigationProp<ParamListBase>,
  ) => (item: unknown) => void;
}

const tokensConfig: SectionConfig = {
  title: strings('trending.tokens'),
  navigationAction: (navigation) => {
    navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW);
  },
  renderItem: (item) => <TrendingTokenRowItem token={item as TrendingAsset} />,
  renderSkeleton: () => <TrendingTokensSkeleton />,
  getSearchableText: (item) =>
    `${(item as TrendingAsset).symbol} ${(item as TrendingAsset).name}`.toLowerCase(),
  keyExtractor: (item) => `token-${(item as TrendingAsset).assetId}`,
};

const perpsConfig: SectionConfig = {
  title: strings('trending.perps'),
  navigationAction: (navigation) => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'all',
      },
    });
  },
  renderItem: (item, onPress) => (
    <PerpsMarketRowItem
      market={item as PerpsMarketData}
      onPress={() => onPress?.(item)}
      showBadge={false}
    />
  ),
  renderSkeleton: () => <PerpsMarketRowSkeleton />,
  getSearchableText: (item) =>
    `${(item as PerpsMarketData).symbol} ${(item as PerpsMarketData).name || ''}`.toLowerCase(),
  keyExtractor: (item) => `perp-${(item as PerpsMarketData).symbol}`,
  getOnPressHandler: (navigation) => (market) => {
    (navigation as NavigationProp<PerpsNavigationParamList>).navigate(
      Routes.PERPS.ROOT,
      {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: market as PerpsMarketData },
      },
    );
  },
};

const predictionsConfig: SectionConfig = {
  title: strings('wallet.predict'),
  navigationAction: (navigation) => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  },
  renderItem: (item) => <PredictMarket market={item as PredictMarketType} />,
  renderSkeleton: () => <PredictMarketSkeleton />,
  getSearchableText: (item) => (item as PredictMarketType).title.toLowerCase(),
  keyExtractor: (item) => `prediction-${(item as PredictMarketType).id}`,
};

/**
 * Centralized configuration for all Trending View sections.
 * This config is used by QuickActions, SectionHeaders, and Search functionality.
 *
 * To add a new section:
 * 1. Add the section ID to the SectionId type
 * 2. Create a config constant above (e.g., newSectionConfig)
 * 3. Add it to both SECTIONS_CONFIG and SECTIONS_ARRAY below
 * 4. Add data fetching in useExploreSearchData hook
 */
export const SECTIONS_CONFIG: Record<SectionId, SectionConfig> = {
  tokens: tokensConfig,
  perps: perpsConfig,
  predictions: predictionsConfig,
};

export const SECTIONS_ARRAY: (SectionConfig & { id: SectionId })[] = [
  { id: 'tokens', ...tokensConfig },
  { id: 'perps', ...perpsConfig },
  { id: 'predictions', ...predictionsConfig },
];
