import React, { PropsWithChildren, useMemo } from 'react';
import Fuse, { type FuseOptions } from 'fuse.js';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import TrendingTokenRowItem from '../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import PerpsMarketRowItem from '../../UI/Perps/components/PerpsMarketRowItem';
import type { PerpsMarketData } from '../../UI/Perps/controllers/types';
import PredictMarket from '../../UI/Predict/components/PredictMarket';
import type { PredictMarket as PredictMarketType } from '../../UI/Predict/types';
import type { PerpsNavigationParamList } from '../../UI/Perps/types/navigation';
import PredictMarketSkeleton from '../../UI/Predict/components/PredictMarketSkeleton';
import { usePredictMarketData } from '../../UI/Predict/hooks/usePredictMarketData';
import { usePerpsMarkets } from '../../UI/Perps/hooks';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';
import { Box, IconName } from '@metamask/design-system-react-native';
import type { SiteData } from '../../UI/Sites/components/SiteRowItem/SiteRowItem';
import SiteRowItemWrapper from '../../UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper';
import SiteSkeleton from '../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import { useSitesData } from '../../UI/Sites/hooks/useSiteData/useSitesData';
import { useTrendingSearch } from '../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import { filterMarketsByQuery } from '../../UI/Perps/utils/marketUtils';
import PredictMarketRowItem from '../../UI/Predict/components/PredictMarketRowItem';
import SectionCard from './components/Sections/SectionTypes/SectionCard';
import SectionCarrousel from './components/Sections/SectionTypes/SectionCarrousel';

export type SectionId = 'predictions' | 'tokens' | 'perps' | 'sites';

interface SectionData {
  data: unknown[];
  isLoading: boolean;
}

interface SectionConfig {
  id: SectionId;
  title: string;
  icon: IconName;
  viewAllAction: (navigation: NavigationProp<ParamListBase>) => void;
  RowItem: React.ComponentType<{
    item: unknown;
    navigation: NavigationProp<ParamListBase>;
  }>;
  OverrideRowItemSearch?: React.ComponentType<{
    item: unknown;
    navigation: NavigationProp<ParamListBase>;
  }>;
  Skeleton: React.ComponentType;
  OverrideSkeletonSearch?: React.ComponentType;
  Section: React.ComponentType<{
    sectionId: SectionId;
    data: unknown[];
    isLoading: boolean;
  }>;
  useSectionData: (searchQuery?: string) => {
    data: unknown[];
    isLoading: boolean;
    refetch: () => Promise<void> | void;
  };
  SectionWrapper?: React.ComponentType<PropsWithChildren>;
}

const BASE_FUSE_OPTIONS = {
  shouldSort: true,
  // Tweak threshold search strictness (0.0 = strict, 1.0 = lenient)
  threshold: 0.2,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
} as const;

const fuseSearch = <T,>(
  data: T[],
  searchQuery: string | undefined,
  fuseOptions: FuseOptions<T>,
  searchSortingFn?: (a: T, b: T) => number,
): T[] => {
  searchQuery = searchQuery?.trim();
  if (!searchQuery) {
    return data;
  }
  const fuse = new Fuse(data, fuseOptions);
  const results = fuse.search(searchQuery);

  if (searchSortingFn) {
    return results.sort(searchSortingFn);
  }

  return results;
};

const TOKEN_FUSE_OPTIONS: FuseOptions<TrendingAsset> = {
  ...BASE_FUSE_OPTIONS,
  keys: ['symbol', 'name', 'assetId'],
};

const PERPS_FUSE_OPTIONS: FuseOptions<PerpsMarketData> = {
  ...BASE_FUSE_OPTIONS,
  keys: ['symbol', 'name'],
};

const PREDICTIONS_FUSE_OPTIONS: FuseOptions<PredictMarketType> = {
  ...BASE_FUSE_OPTIONS,
  keys: ['title', 'description'],
};

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
    icon: IconName.Ethereum,
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW);
    },
    RowItem: ({ item }) => (
      <TrendingTokenRowItem token={item as TrendingAsset} />
    ),
    Skeleton: TrendingTokensSkeleton,
    Section: SectionCard,
    useSectionData: (searchQuery) => {
      const { data, isLoading, refetch } = useTrendingSearch(
        searchQuery,
        undefined,
        undefined,
        false, // Disable debouncing here because useExploreSearch already handles it
      );
      const filteredData = useMemo(
        () =>
          fuseSearch(
            data,
            searchQuery,
            TOKEN_FUSE_OPTIONS,
            // Penalize zero marketCap tokens
            (a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0),
          ),
        [data, searchQuery],
      );
      return { data: filteredData, isLoading, refetch };
    },
  },
  perps: {
    id: 'perps',
    title: strings('trending.perps'),
    icon: IconName.Candlestick,
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
    // Using trending skeleton cause PerpsMarketRowSkeleton has too much spacing
    Skeleton: TrendingTokensSkeleton,
    SectionWrapper: ({ children }) => (
      <PerpsConnectionProvider>
        <PerpsStreamProvider>{children}</PerpsStreamProvider>
      </PerpsConnectionProvider>
    ),
    Section: SectionCard,
    useSectionData: (searchQuery) => {
      const { markets, isLoading, refresh, isRefreshing } = usePerpsMarkets();

      const filteredMarkets = useMemo(() => {
        if (!searchQuery) {
          return markets;
        }
        const filteredByQuery = filterMarketsByQuery(markets, searchQuery);
        return fuseSearch(filteredByQuery, searchQuery, PERPS_FUSE_OPTIONS);
      }, [markets, searchQuery]);

      return {
        data: filteredMarkets,
        isLoading: isLoading || isRefreshing,
        refetch: refresh,
      };
    },
  },
  predictions: {
    id: 'predictions',
    title: strings('wallet.predict'),
    icon: IconName.Speedometer,
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
      });
    },
    RowItem: ({ item }) => (
      <Box twClassName="py-2">
        <PredictMarket market={item as PredictMarketType} isCarousel />
      </Box>
    ),
    OverrideRowItemSearch: ({ item }) => (
      <PredictMarketRowItem market={item as PredictMarketType} />
    ),
    Skeleton: () => <PredictMarketSkeleton isCarousel />,
    // Using sites skeleton cause PredictMarketSkeleton has too much spacing
    OverrideSkeletonSearch: SiteSkeleton,
    Section: SectionCarrousel,
    useSectionData: (searchQuery) => {
      const { marketData, isFetching, refetch } = usePredictMarketData({
        category: 'trending',
        pageSize: searchQuery ? 20 : 6,
        q: searchQuery || undefined,
      });

      const filteredData = useMemo(
        () => fuseSearch(marketData, searchQuery, PREDICTIONS_FUSE_OPTIONS),
        [marketData, searchQuery],
      );

      return { data: filteredData, isLoading: isFetching, refetch };
    },
  },
  sites: {
    id: 'sites',
    title: strings('trending.sites'),
    icon: IconName.Global,
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.SITES_FULL_VIEW);
    },
    RowItem: ({ item, navigation }) => (
      <SiteRowItemWrapper site={item as SiteData} navigation={navigation} />
    ),
    Skeleton: SiteSkeleton,
    Section: SectionCard,
    useSectionData: (searchQuery) => {
      const { sites, isLoading, refetch } = useSitesData(searchQuery, 100);
      return { data: sites, isLoading, refetch };
    },
  },
};

// Sorted by order on the main screen
export const HOME_SECTIONS_ARRAY: (SectionConfig & { id: SectionId })[] = [
  SECTIONS_CONFIG.predictions,
  SECTIONS_CONFIG.tokens,
  SECTIONS_CONFIG.perps,
  SECTIONS_CONFIG.sites,
];

// Sorted by order on the QuickAction buttons and SearchResults
export const SECTIONS_ARRAY: (SectionConfig & { id: SectionId })[] = [
  SECTIONS_CONFIG.tokens,
  SECTIONS_CONFIG.perps,
  SECTIONS_CONFIG.predictions,
  SECTIONS_CONFIG.sites,
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
  searchQuery: string,
): Record<SectionId, SectionData> => {
  const { data: trendingTokens, isLoading: isTokensLoading } =
    SECTIONS_CONFIG.tokens.useSectionData(searchQuery);

  const { data: perpsMarkets, isLoading: isPerpsLoading } =
    SECTIONS_CONFIG.perps.useSectionData(searchQuery);

  const { data: predictionMarkets, isLoading: isPredictionsLoading } =
    SECTIONS_CONFIG.predictions.useSectionData(searchQuery);

  const { data: sites, isLoading: isSitesLoading } =
    SECTIONS_CONFIG.sites.useSectionData(searchQuery);

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
    sites: {
      data: sites,
      isLoading: isSitesLoading,
    },
  };
};
