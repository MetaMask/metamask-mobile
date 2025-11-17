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
import SectionCard from '../components/SectionCard/SectionCard';
import SectionCarrousel from '../components/SectionCarrousel/SectionCarrousel';
import { useTrendingRequest } from '../../../UI/Assets/hooks/useTrendingRequest';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import { usePerpsMarkets } from '../../../UI/Perps/hooks';
import { PerpsConnectionProvider } from '../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../UI/Perps/providers/PerpsStreamManager';

export type SectionId = 'predictions' | 'tokens' | 'perps';

interface SectionData {
  data: unknown[];
  isLoading: boolean;
}

interface SectionConfig {
  id: SectionId;
  title: string;
  viewAllAction: (navigation: NavigationProp<ParamListBase>) => void;
  RowItem: React.ComponentType<{
    item: unknown;
    navigation: NavigationProp<ParamListBase>;
  }>;
  Skeleton: React.ComponentType;
  getSearchableText: (item: unknown) => string;
  keyExtractor: (item: unknown) => string;
  Section: React.ComponentType;
  useSectionData: (searchQuery?: string) => {
    data: unknown[];
    isLoading: boolean;
  };
}

/**
 * Centralized configuration for all Trending View sections.
 * This config is used by QuickActions, SectionHeaders, Search, and TrendingView rendering.
 *
 * To add a new section (EVERYTHING IN THIS FILE):
 * 1. Add the section ID to the SectionId type above
 * 2. Add the config to SECTIONS_CONFIG, HOME_SECTIONS_ARRAY, and SECTIONS_ARRAY below
 * 3. Add the hook to useSectionsData below
 *
 * The section will automatically appear in:
 * - TrendingView main feed
 * - QuickActions buttons
 * - Search results
 * - Section headers with "View All" navigation
 */

export const SECTIONS_CONFIG: Record<SectionId, SectionConfig> = {
  tokens: {
    id: 'tokens',
    title: strings('trending.tokens'),
    viewAllAction: (_navigation) => {
      // TODO: Implement tokens navigation when ready
      // _navigation.navigate(...);
    },
    RowItem: ({ item }) => (
      <TrendingTokenRowItem
        token={item as TrendingAsset}
        onPress={() => undefined}
      />
    ),
    Skeleton: () => <TrendingTokensSkeleton />,
    getSearchableText: (item) =>
      `${(item as TrendingAsset).symbol} ${(item as TrendingAsset).name}`.toLowerCase(),
    keyExtractor: (item) => `token-${(item as TrendingAsset).assetId}`,
    Section: () => <SectionCard sectionId="tokens" />,
    useSectionData: () => {
      const { results, isLoading } = useTrendingRequest({});

      return { data: results, isLoading };
    },
  },
  perps: {
    id: 'perps',
    title: strings('trending.perps'),
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          defaultMarketTypeFilter: 'all',
        },
      });
    },
    RowItem: ({ item, navigation }) => (
      <PerpsMarketRowItem
        market={item as PerpsMarketData}
        onPress={() => {
          (navigation as NavigationProp<PerpsNavigationParamList>)?.navigate(
            Routes.PERPS.ROOT,
            {
              screen: Routes.PERPS.MARKET_DETAILS,
              params: { market: item as PerpsMarketData },
            },
          );
        }}
        showBadge={false}
      />
    ),
    Skeleton: () => <PerpsMarketRowSkeleton />,
    getSearchableText: (item) =>
      `${(item as PerpsMarketData).symbol} ${(item as PerpsMarketData).name || ''}`.toLowerCase(),
    keyExtractor: (item) => `perp-${(item as PerpsMarketData).symbol}`,
    Section: () => (
      <PerpsConnectionProvider>
        <PerpsStreamProvider>
          <SectionCard sectionId="perps" />
        </PerpsStreamProvider>
      </PerpsConnectionProvider>
    ),
    useSectionData: () => {
      const { markets, isLoading } = usePerpsMarkets();

      return { data: markets, isLoading };
    },
  },
  predictions: {
    id: 'predictions',
    title: strings('wallet.predict'),
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
      });
    },
    RowItem: ({ item }) => <PredictMarket market={item as PredictMarketType} />,
    Skeleton: () => <PredictMarketSkeleton />,
    getSearchableText: (item) =>
      (item as PredictMarketType).title.toLowerCase(),
    keyExtractor: (item) => `prediction-${(item as PredictMarketType).id}`,
    Section: () => <SectionCarrousel sectionId="predictions" />,
    useSectionData: (searchQuery?: string) => {
      const { marketData, isFetching } = usePredictMarketData({
        category: 'trending',
        pageSize: searchQuery ? 20 : 6,
        q: searchQuery || undefined,
      });

      return { data: marketData, isLoading: isFetching };
    },
  },
};

// Sorted by order on the main screen
export const HOME_SECTIONS_ARRAY: (SectionConfig & { id: SectionId })[] = [
  SECTIONS_CONFIG.predictions,
  SECTIONS_CONFIG.tokens,
  SECTIONS_CONFIG.perps,
];

// Sorted by order on the QuickAction buttons and SearchResults
export const SECTIONS_ARRAY: (SectionConfig & { id: SectionId })[] = [
  SECTIONS_CONFIG.tokens,
  SECTIONS_CONFIG.perps,
  SECTIONS_CONFIG.predictions,
];

/**
 * Centralized hook that fetches data for all sections.
 * When adding a new section, add its hook call here.
 * This keeps all section-related logic in one file.
 *
 * @param searchQuery - Optional search query for sections that support search
 * @returns Data and loading state for all sections
 */
export const useSectionsData = (
  searchQuery?: string,
): Record<SectionId, SectionData> => {
  const { data: trendingTokens, isLoading: isTokensLoading } =
    SECTIONS_CONFIG.tokens.useSectionData();
  const { data: perpsMarkets, isLoading: isPerpsLoading } =
    SECTIONS_CONFIG.perps.useSectionData();
  const { data: predictionMarkets, isLoading: isPredictionsLoading } =
    SECTIONS_CONFIG.predictions.useSectionData(searchQuery);

  return {
    tokens: {
      data: trendingTokens,
      isLoading: isTokensLoading,
    },
    perps: {
      data: perpsMarkets,
      isLoading: isPerpsLoading,
    },
    predictions: {
      data: predictionMarkets,
      isLoading: isPredictionsLoading,
    },
  };
};
