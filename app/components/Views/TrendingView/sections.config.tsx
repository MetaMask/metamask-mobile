import React, { PropsWithChildren, useContext, useMemo } from 'react';
import Fuse, { type FuseOptions } from 'fuse.js';
import type { NavigationProp } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import TrendingTokenRowItem from '../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import PerpsMarketRowItem from '../../UI/Perps/components/PerpsMarketRowItem';
import {
  filterMarketsByQuery,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import type { PredictMarket as PredictMarketType } from '../../UI/Predict/types';
import type { PerpsNavigationParamList } from '../../UI/Perps/types/navigation';
import { usePredictMarketData } from '../../UI/Predict/hooks/usePredictMarketData';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectExploreSectionsOrder } from '../../../selectors/featureFlagController/exploreSectionsOrder';
import { selectPerpsWatchlistMarkets } from '../../UI/Perps/selectors/perpsController';
import { useHomepageSparklines } from '../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines';
import { usePerpsMarkets } from '../../UI/Perps/hooks';
import {
  PerpsConnectionContext,
  PerpsConnectionProvider,
} from '../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';
import {
  Box,
  IconName as DSIconName,
} from '@metamask/design-system-react-native';
import { IconName as LocalIconName } from '../../../component-library/components/Icons/Icon/Icon.types';
import type { SiteData } from '../../UI/Sites/components/SiteRowItem/SiteRowItem';
import SiteRowItemWrapper from '../../UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper';
import SiteSkeleton from '../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import { useSitesData } from '../../UI/Sites/hooks/useSiteData/useSitesData';
import { useTrendingSearch } from '../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import {
  TimeOption,
  PriceChangeOption,
} from '../../UI/Trending/components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../UI/Trending/components/TrendingTokensList/TrendingTokensList';
import PredictMarketRowItem from '../../UI/Predict/components/PredictMarketRowItem';
import SectionCard from './components/Sections/SectionTypes/SectionCard';
import { useRwaTokens } from '../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import SectionCarrousel from './components/Sections/SectionTypes/SectionCarrousel';
import PredictMarket from '../../UI/Predict/components/PredictMarket';
import PredictMarketSkeleton from '../../UI/Predict/components/PredictMarketSkeleton';
import PerpsMarketTileCard from '../Homepage/Sections/Perpetuals/components/PerpsMarketTileCard';
import PerpsMarketTileCardSkeleton from '../Homepage/Sections/Perpetuals/components/PerpsMarketTileCardSkeleton';
import SectionHorizontalScroll from './components/Sections/SectionTypes/SectionHorizontalScroll';

export type SectionId = 'predictions' | 'tokens' | 'perps' | 'stocks' | 'sites';

export type SectionIcon =
  | { source: 'local'; name: LocalIconName }
  | { source: 'design-system'; name: DSIconName };

interface SectionData {
  data: unknown[];
  isLoading: boolean;
}

export interface SectionConfig {
  id: SectionId;
  title: string;
  icon: SectionIcon;
  viewAllAction: (navigation: AppNavigationProp) => void;
  /** Returns a stable identifier for an item (e.g. assetId, symbol, url) used in analytics */
  getItemIdentifier: (item: unknown) => string;
  RowItem: React.ComponentType<{
    item: unknown;
    index: number;
    navigation: AppNavigationProp;
  }>;
  OverrideRowItemSearch?: React.ComponentType<{
    item: unknown;
    index?: number;
    navigation: AppNavigationProp;
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

/**
 * Default filter context for tokens in the Trending View home section.
 * Used for analytics tracking of token clicks from the home page.
 */
const DEFAULT_TOKENS_FILTER_CONTEXT: TrendingFilterContext = {
  timeFilter: TimeOption.TwentyFourHours,
  sortOption: PriceChangeOption.PriceChange,
  networkFilter: 'all',
  isSearchResult: false,
};

/**
 * Filter context for tokens in search results on the Explore page.
 * Used for analytics tracking of token clicks from search results.
 */
const SEARCH_TOKENS_FILTER_CONTEXT: TrendingFilterContext = {
  timeFilter: TimeOption.TwentyFourHours,
  sortOption: PriceChangeOption.PriceChange,
  networkFilter: 'all',
  isSearchResult: true,
};

const PerpsExploreTileCard: React.FC<{
  item: unknown;
  index: number;
  navigation: AppNavigationProp;
}> = ({ item, navigation }) => {
  const market = item as PerpsMarketData;
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);
  const isWatchlisted = useMemo(
    () => (watchlistSymbols ?? []).includes(market.symbol),
    [watchlistSymbols, market.symbol],
  );
  const { sparklines } = useHomepageSparklines([market.symbol]);

  return (
    <PerpsMarketTileCard
      market={market}
      sparklineData={sparklines[market.symbol]}
      showFavoriteTag={isWatchlisted}
      onPress={() => {
        (navigation as NavigationProp<PerpsNavigationParamList>)?.navigate(
          Routes.PERPS.ROOT,
          {
            screen: Routes.PERPS.MARKET_DETAILS,
            params: {
              market,
              source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
            },
          },
        );
      }}
    />
  );
};

export const SECTIONS_CONFIG: Record<SectionId, SectionConfig> = {
  tokens: {
    id: 'tokens',
    title: strings('trending.trending_tokens'),
    icon: { source: 'design-system', name: DSIconName.Ethereum },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW);
    },
    getItemIdentifier: (item) => (item as Partial<TrendingAsset>).assetId ?? '',
    RowItem: ({ item, index }) => (
      <TrendingTokenRowItem
        token={item as TrendingAsset}
        position={index}
        filterContext={DEFAULT_TOKENS_FILTER_CONTEXT}
      />
    ),
    OverrideRowItemSearch: ({ item, index }) => (
      <TrendingTokenRowItem
        token={item as TrendingAsset}
        position={index}
        filterContext={SEARCH_TOKENS_FILTER_CONTEXT}
      />
    ),
    Skeleton: TrendingTokensSkeleton,
    Section: SectionCard,
    useSectionData: (searchQuery) => {
      const { data, isLoading, refetch } = useTrendingSearch({
        searchQuery,
        enableDebounce: false, // Disable debouncing here because useExploreSearch already handles it
      });
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
    icon: { source: 'design-system', name: DSIconName.Candlestick },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          defaultMarketTypeFilter: 'all',
          source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
        },
      });
    },
    getItemIdentifier: (item) =>
      (item as Partial<PerpsMarketData>).symbol ?? '',
    RowItem: PerpsExploreTileCard,
    OverrideRowItemSearch: ({ item, index: _index, navigation }) => (
      <PerpsMarketRowItem
        market={item as PerpsMarketData}
        onPress={() => {
          (navigation as NavigationProp<PerpsNavigationParamList>)?.navigate(
            Routes.PERPS.ROOT,
            {
              screen: Routes.PERPS.MARKET_DETAILS,
              params: {
                market: item as PerpsMarketData,
                source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
              },
            },
          );
        }}
        showBadge={false}
        compact
      />
    ),

    Skeleton: PerpsMarketTileCardSkeleton,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    SectionWrapper: ({ children }) => (
      <PerpsConnectionProvider suppressErrorView>
        <PerpsStreamProvider>{children}</PerpsStreamProvider>
      </PerpsConnectionProvider>
    ),
    Section: SectionHorizontalScroll,
    useSectionData: (searchQuery) => {
      const connectionContext = useContext(PerpsConnectionContext);
      const { markets, isLoading, refresh, isRefreshing } = usePerpsMarkets();

      const filteredMarkets = useMemo(() => {
        if (connectionContext?.error) return [];
        if (!searchQuery) {
          return [...markets].sort(
            (a, b) =>
              (parseFloat(b.change24hPercent) || 0) -
              (parseFloat(a.change24hPercent) || 0),
          );
        }
        const filteredByQuery = filterMarketsByQuery(markets, searchQuery);
        return fuseSearch(filteredByQuery, searchQuery, PERPS_FUSE_OPTIONS);
      }, [markets, searchQuery, connectionContext?.error]);

      return {
        data: filteredMarkets,
        isLoading: connectionContext?.error ? false : isLoading || isRefreshing,
        refetch: refresh,
      };
    },
  },
  stocks: {
    id: 'stocks',
    title: strings('trending.stocks'),
    icon: { source: 'local', name: LocalIconName.CorporateFare },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW);
    },
    getItemIdentifier: (item) => (item as Partial<TrendingAsset>).assetId ?? '',
    RowItem: ({ item, index }) => (
      <TrendingTokenRowItem
        token={item as TrendingAsset}
        position={index}
        filterContext={DEFAULT_TOKENS_FILTER_CONTEXT}
      />
    ),
    OverrideRowItemSearch: ({ item, index }) => (
      <TrendingTokenRowItem
        token={item as TrendingAsset}
        position={index}
        filterContext={SEARCH_TOKENS_FILTER_CONTEXT}
      />
    ),
    Skeleton: TrendingTokensSkeleton,
    Section: SectionCard,
    useSectionData: (searchQuery) => {
      const { data, isLoading, refetch } = useRwaTokens({ searchQuery });
      return { data, isLoading, refetch };
    },
  },
  predictions: {
    id: 'predictions',
    title: strings('wallet.predict'),
    icon: { source: 'design-system', name: DSIconName.Speedometer },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
      });
    },
    getItemIdentifier: (item) => (item as Partial<PredictMarketType>).id ?? '',
    RowItem: ({ item, index: _index }) => (
      <Box twClassName="py-2">
        <PredictMarket
          market={item as PredictMarketType}
          isCarousel
          testID={`predict-market-row-item-${(item as PredictMarketType).id}`}
        />
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
    icon: { source: 'design-system', name: DSIconName.Global },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.SITES_FULL_VIEW);
    },
    getItemIdentifier: (item) => (item as Partial<SiteData>).url ?? '',
    RowItem: ({ item, index: _index, navigation }) => (
      <SiteRowItemWrapper site={item as SiteData} navigation={navigation} />
    ),
    Skeleton: SiteSkeleton,
    Section: SectionCard,
    useSectionData: (searchQuery) => {
      const { sites, isLoading, refetch } = useSitesData(searchQuery);
      return { data: sites, isLoading, refetch };
    },
  },
};

const DEFAULT_HOME_ORDER: SectionId[] = [
  SECTIONS_CONFIG.predictions.id,
  SECTIONS_CONFIG.tokens.id,
  SECTIONS_CONFIG.perps.id,
  SECTIONS_CONFIG.stocks.id,
  SECTIONS_CONFIG.sites.id,
];
const DEFAULT_QUICK_ACTIONS_ORDER: SectionId[] = [
  SECTIONS_CONFIG.tokens.id,
  SECTIONS_CONFIG.perps.id,
  SECTIONS_CONFIG.stocks.id,
  SECTIONS_CONFIG.predictions.id,
  SECTIONS_CONFIG.sites.id,
];
const DEFAULT_SEARCH_ORDER: SectionId[] = [
  SECTIONS_CONFIG.tokens.id,
  SECTIONS_CONFIG.perps.id,
  SECTIONS_CONFIG.stocks.id,
  SECTIONS_CONFIG.predictions.id,
  SECTIONS_CONFIG.sites.id,
];

const buildSections = (
  order: SectionId[],
  isPerpsEnabled: boolean,
): (SectionConfig & { id: SectionId })[] =>
  order
    .filter((id) => isPerpsEnabled || id !== 'perps')
    .map((id) => SECTIONS_CONFIG[id]);

export const useHomeSections = (): (SectionConfig & { id: SectionId })[] => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const orderConfig = useSelector(selectExploreSectionsOrder);

  return useMemo(
    () =>
      buildSections(orderConfig?.home ?? DEFAULT_HOME_ORDER, isPerpsEnabled),
    [isPerpsEnabled, orderConfig],
  );
};

export const useQuickActionsSectionsArray = (): (SectionConfig & {
  id: SectionId;
})[] => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const orderConfig = useSelector(selectExploreSectionsOrder);

  return useMemo(
    () =>
      buildSections(
        orderConfig?.quickActions ?? DEFAULT_QUICK_ACTIONS_ORDER,
        isPerpsEnabled,
      ),
    [isPerpsEnabled, orderConfig],
  );
};

export const useSearchSectionsArray = (): (SectionConfig & {
  id: SectionId;
})[] => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const orderConfig = useSelector(selectExploreSectionsOrder);

  return useMemo(
    () =>
      buildSections(
        orderConfig?.search ?? DEFAULT_SEARCH_ORDER,
        isPerpsEnabled,
      ),
    [isPerpsEnabled, orderConfig],
  );
};

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

  const { data: stocks, isLoading: isStocksLoading } =
    SECTIONS_CONFIG.stocks.useSectionData(searchQuery);

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
    stocks: {
      // Avoids making 2 API calls to the search endpoint when searching on the main search
      data: stocks,
      isLoading: isStocksLoading,
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
