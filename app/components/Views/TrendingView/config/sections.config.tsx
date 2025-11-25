import React from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type {
  TrendingAsset,
  SortTrendingBy,
} from '@metamask/assets-controllers';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import TrendingTokenRowItem from '../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import PerpsMarketRowItem from '../../../UI/Perps/components/PerpsMarketRowItem';
import PerpsMarketRowSkeleton from '../../../UI/Perps/Views/PerpsMarketListView/components/PerpsMarketRowSkeleton';
import type { PerpsMarketData } from '../../../UI/Perps/controllers/types';
import PredictMarket from '../../../UI/Predict/components/PredictMarket';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import PredictMarketSkeleton from '../../../UI/Predict/components/PredictMarketSkeleton';
import SectionCard from '../components/SectionCard/SectionCard';
import SectionCarrousel from '../components/SectionCarrousel/SectionCarrousel';
import { useTrendingRequest } from '../../../UI/Trending/hooks/useTrendingRequest';
import { sortTrendingTokens } from '../../../UI/Trending/utils/sortTrendingTokens';
import { PriceChangeOption } from '../../../UI/Trending/components/TrendingTokensBottomSheet';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import { usePerpsMarkets } from '../../../UI/Perps/hooks';
import { PerpsConnectionProvider } from '../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../UI/Perps/providers/PerpsStreamManager';
import { useSearchRequest } from '../../../UI/Trending/hooks/useSearchRequest';
import { Box, IconName } from '@metamask/design-system-react-native';
import type { SiteData } from '../SectionSites/SiteRowItem/SiteRowItem';
import SiteRowItemWrapper from '../SectionSites/SiteRowItemWrapper';
import SiteSkeleton from '../SectionSites/SiteSkeleton/SiteSkeleton';
import { useSitesData } from '../SectionSites/hooks/useSitesData';

export type SectionId = 'predictions' | 'tokens' | 'perps' | 'sites';

interface SectionData {
  data: unknown[];
  isLoading: boolean;
  refetch?: () => void;
}

interface SectionParams {
  searchQuery?: string;
  sortBy?: SortTrendingBy;
  chainIds?: CaipChainId[] | null;
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
  Skeleton: React.ComponentType;
  getSearchableText: (item: unknown) => string;
  keyExtractor: (item: unknown) => string;
  Section: React.ComponentType;
  useSectionData: (params?: SectionParams) => {
    data: unknown[];
    isLoading: boolean;
    refetch?: () => void;
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
    icon: IconName.Ethereum,
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW);
    },
    RowItem: ({ item }) => (
      <TrendingTokenRowItem token={item as TrendingAsset} />
    ),
    Skeleton: () => <TrendingTokensSkeleton />,
    getSearchableText: (item) =>
      `${(item as TrendingAsset).symbol} ${(item as TrendingAsset).name}`.toLowerCase(),
    keyExtractor: (item) => `token-${(item as TrendingAsset).assetId}`,
    Section: () => <SectionCard sectionId="tokens" />,
    useSectionData: (params?: SectionParams) => {
      const { searchQuery, sortBy, chainIds } = params ?? {};
      // Trending will return tokens that have just been created which wont be picked up by search API
      // so if you see a token on trending and search on omnisearch which uses the search endpoint...
      // There is a chance you will get 0 results
      const { results: searchResults, isLoading: isSearchLoading } =
        useSearchRequest({
          query: searchQuery || '',
          limit: 20,
          chainIds: [],
        });

      const {
        results: trendingResults,
        isLoading: isTrendingLoading,
        fetch: fetchTrendingTokens,
      } = useTrendingRequest({
        sortBy,
        chainIds: chainIds ?? undefined,
      });

      if (!searchQuery) {
        const sortedResults = sortTrendingTokens(
          trendingResults,
          PriceChangeOption.PriceChange,
        );
        return {
          data: sortedResults,
          isLoading: isTrendingLoading,
          refetch: () => {
            fetchTrendingTokens();
          },
        };
      }

      const resultMap = new Map(
        trendingResults.map((result) => [result.assetId, result]),
      );

      searchResults.forEach((result) => {
        const asset = result as TrendingAsset;
        if (!resultMap.has(asset.assetId)) {
          resultMap.set(asset.assetId, asset);
        }
      });

      return {
        data: Array.from(resultMap.values()),
        isLoading: isSearchLoading,
        refetch: () => {
          fetchTrendingTokens();
        },
      };
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
    Skeleton: () => <PredictMarketSkeleton isCarousel />,
    getSearchableText: (item) =>
      (item as PredictMarketType).title.toLowerCase(),
    keyExtractor: (item) => `prediction-${(item as PredictMarketType).id}`,
    Section: () => <SectionCarrousel sectionId="predictions" />,
    useSectionData: (params?: SectionParams) => {
      const { searchQuery } = params ?? {};
      const { marketData, isFetching } = usePredictMarketData({
        category: 'trending',
        pageSize: searchQuery ? 20 : 6,
        q: searchQuery || undefined,
      });

      return { data: marketData, isLoading: isFetching };
    },
  },
  sites: {
    id: 'sites',
    title: strings('trending.sites'),
    icon: IconName.Global,
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.SITES_LIST_VIEW);
    },
    RowItem: ({ item, navigation }) => (
      <SiteRowItemWrapper site={item as SiteData} navigation={navigation} />
    ),
    Skeleton: () => <SiteSkeleton />,
    getSearchableText: (item) =>
      `${(item as SiteData).name} ${(item as SiteData).displayUrl}`.toLowerCase(),
    keyExtractor: (item) => `site-${(item as SiteData).id}`,
    Section: () => <SectionCard sectionId="sites" />,
    useSectionData: () => {
      const { sites, isLoading } = useSitesData({ limit: 100 });
      return { data: sites, isLoading };
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
  searchQuery?: string,
): Record<SectionId, SectionData> => {
  const { data: trendingTokens, isLoading: isTokensLoading } =
    SECTIONS_CONFIG.tokens.useSectionData({ searchQuery });
  const { data: perpsMarkets, isLoading: isPerpsLoading } =
    SECTIONS_CONFIG.perps.useSectionData();
  const { data: predictionMarkets, isLoading: isPredictionsLoading } =
    SECTIONS_CONFIG.predictions.useSectionData({ searchQuery });
  const { data: sites, isLoading: isSitesLoading } =
    SECTIONS_CONFIG.sites.useSectionData();

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
