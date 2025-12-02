import React from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import TrendingTokenRowItem from '../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import PerpsMarketRowItem from '../../../UI/Perps/components/PerpsMarketRowItem';
import type { PerpsMarketData } from '../../../UI/Perps/controllers/types';
import PredictMarket from '../../../UI/Predict/components/PredictMarket';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import PredictMarketSkeleton from '../../../UI/Predict/components/PredictMarketSkeleton';
import SectionCard from '../components/SectionCard/SectionCard';
import SectionCarrousel from '../components/SectionCarrousel/SectionCarrousel';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import { usePerpsMarkets } from '../../../UI/Perps/hooks';
import { PerpsConnectionProvider } from '../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../UI/Perps/providers/PerpsStreamManager';
import { Box, IconName } from '@metamask/design-system-react-native';
import type { SiteData } from '../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import SiteRowItemWrapper from '../../../UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper';
import SiteSkeleton from '../../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import { useSitesData } from '../../../UI/Sites/hooks/useSiteData/useSitesData';
import { useTrendingSearch } from '../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import { filterMarketsByQuery } from '../../../UI/Perps/utils/marketUtils';
import PredictMarketRowItem from '../../../UI/Predict/components/PredictMarketRowItem';

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
  Section: React.ComponentType<{ refreshTrigger?: number }>;
  useSectionData: (searchQuery?: string) => {
    data: unknown[];
    isLoading: boolean;
    refetch: () => Promise<void> | void;
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
    Section: ({ refreshTrigger }) => (
      <SectionCard sectionId="tokens" refreshTrigger={refreshTrigger} />
    ),
    useSectionData: (searchQuery) => {
      const { data, isLoading, refetch } = useTrendingSearch(searchQuery);
      return { data, isLoading, refetch };
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
    Skeleton: () => <TrendingTokensSkeleton />,
    Section: ({ refreshTrigger }) => (
      <PerpsConnectionProvider>
        <PerpsStreamProvider>
          <SectionCard sectionId="perps" refreshTrigger={refreshTrigger} />
        </PerpsStreamProvider>
      </PerpsConnectionProvider>
    ),
    useSectionData: (searchQuery) => {
      const { markets, isLoading, refresh, isRefreshing } = usePerpsMarkets();

      const filteredMarkets = searchQuery
        ? filterMarketsByQuery(markets, searchQuery)
        : markets;

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
    Section: ({ refreshTrigger }) => (
      <SectionCarrousel
        sectionId="predictions"
        refreshTrigger={refreshTrigger}
      />
    ),
    useSectionData: (searchQuery) => {
      const { marketData, isFetching, refetch } = usePredictMarketData({
        category: 'trending',
        pageSize: searchQuery ? 20 : 6,
        q: searchQuery || undefined,
      });

      return { data: marketData, isLoading: isFetching, refetch };
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
    Skeleton: () => <SiteSkeleton />,
    Section: ({ refreshTrigger }) => (
      <SectionCard sectionId="sites" refreshTrigger={refreshTrigger} />
    ),
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
