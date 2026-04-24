import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import Fuse, { type FuseOptions } from 'fuse.js';
import { StackActions, type NavigationProp } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { isCaipChainId, type CaipChainId } from '@metamask/utils';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import TrendingTokenRowItem, {
  getAssetNavigationParams,
} from '../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { getPriceChangeFieldKey } from '../../UI/Trending/components/TrendingTokenRowItem/utils';
import TrendingFeedSessionManager from '../../UI/Trending/services/TrendingFeedSessionManager';
import { useAddPopularNetwork } from '../../hooks/useAddPopularNetwork';
import { PopularList } from '../../../util/networks/customNetworks';
import { TokenDetailsSource } from '../../UI/TokenDetails/constants/constants';
import { selectNetworkConfigurationsByCaipChainId } from '../../../selectors/networkController';
import TrendingTokensSkeleton from '../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import PerpsMarketRowItem from '../../UI/Perps/components/PerpsMarketRowItem';
import PerpsRowSkeleton from '../../UI/Perps/components/PerpsRowSkeleton';
import {
  filterMarketsByQuery,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import type { PredictMarket as PredictMarketType } from '../../UI/Predict/types';
import type { PerpsNavigationParamList } from '../../UI/Perps/types/navigation';
import { usePredictMarketData } from '../../UI/Predict/hooks/usePredictMarketData';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { usePerpsMarkets } from '../../UI/Perps/hooks';
import type { PerpsMarketDataWithVolumeNumber } from '../../UI/Perps/hooks/usePerpsMarkets';
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
import { useBrowserRecentsSites } from '../../UI/Sites/hooks/useBrowserRecentsSites/useBrowserRecentsSites';
import { useTrendingSearch } from '../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import {
  TimeOption,
  PriceChangeOption,
  SortDirection,
} from '../../UI/Trending/components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../UI/Trending/components/TrendingTokensList/TrendingTokensList';
import PredictMarketRowItem from '../../UI/Predict/components/PredictMarketRowItem';
import SectionCard from './components/Sections/SectionTypes/SectionCard';
import SectionPills from './components/Sections/SectionTypes/SectionPills/SectionPills';
import SectionPillsSkeleton from './components/Sections/SectionTypes/SectionPills/SectionPillsSkeleton';
import CryptoMoversPillItem from './components/Sections/SectionTypes/CryptoMoversPillItem/CryptoMoversPillItem';
import TileSection from './components/Sections/SectionTypes/TileSection';
import TrendingTokenTileCard from './components/Sections/SectionTypes/TrendingTokenTileCard/TrendingTokenTileCard';
import TrendingTokenTileCardSkeleton from './components/Sections/SectionTypes/TrendingTokenTileCard/TrendingTokenTileCardSkeleton';
import SiteRecentsTileRowItem from './components/Sections/SectionTypes/SiteRecentsTileRowItem/SiteRecentsTileRowItem';
import SiteRecentsTileSkeleton from './components/Sections/SectionTypes/SiteRecentsTileRowItem/SiteRecentsTileSkeleton';
import { useTrendingTokenTileSparklines } from './components/Sections/SectionTypes/TrendingTokenTileCard/useTrendingTokenTileSparklines';
import { useRwaTokens } from '../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import SectionCarrousel from './components/Sections/SectionTypes/SectionCarrousel';
import PredictMarket from '../../UI/Predict/components/PredictMarket';
import PredictMarketSkeleton from '../../UI/Predict/components/PredictMarketSkeleton';
import PerpsMarketTileCard from '../Homepage/Sections/Perpetuals/components/PerpsMarketTileCard';
import PerpsMarketTileCardSkeleton from '../Homepage/Sections/Perpetuals/components/PerpsMarketTileCardSkeleton';
import { useHomepageSparklines } from '../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines';
import { selectPerpsWatchlistMarkets } from '../../UI/Perps/selectors/perpsController';
import PillToggledCardSection, {
  type PillToggledTab,
} from './components/Sections/SectionTypes/PillToggledCardSection';

export type SectionId =
  | 'predictions'
  | 'sports_predictions'
  | 'crypto_predictions'
  | 'politics_predictions'
  | 'tokens'
  | 'crypto_movers'
  | 'perps'
  | 'rwa_perps'
  | 'macro_stocks_commodity_perps'
  | 'crypto_perps'
  | 'stocks'
  | 'sites'
  | 'dapps_recents';

export type SectionIcon =
  | { source: 'local'; name: LocalIconName }
  | { source: 'design-system'; name: DSIconName };

export interface SectionData {
  data: unknown[];
  isLoading: boolean;
}

export interface SectionConfig {
  id: SectionId;
  title: string;
  icon: SectionIcon;
  viewAllAction: (navigation: AppNavigationProp) => void;
  /**
   * When false, the section title is not tappable and no trailing chevron is shown.
   * @default true
   */
  showViewAllInHeader?: boolean;
  /**
   * For {@link TileSection} only: when false, the trailing "view more" tile is omitted.
   * @default true
   */
  showViewMoreTile?: boolean;
  /** Returns a stable identifier for an item (e.g. assetId, symbol, url) used in analytics */
  getItemIdentifier: (item: unknown) => string;
  RowItem: React.ComponentType<{
    item: unknown;
    index: number;
    navigation: AppNavigationProp;
    extra?: unknown;
  }>;
  OverrideRowItemSearch?: React.ComponentType<{
    item: unknown;
    index?: number;
    navigation: AppNavigationProp;
  }>;
  /** Batches any per-tile subscriptions (sparklines, watchlist) for the slice of items shown in the carousel. */
  useTileExtra?: (items: unknown[]) => unknown;
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
 * This config is used by section headers, search, and TrendingView rendering.
 *
 * To add a new section (EVERYTHING IN THIS FILE):
 * 1. Add the section ID to the SectionId type above
 * 2. Add the config to SECTIONS_CONFIG. For **Explore omni-search**, add it in `useExploreSearchSectionsData` in `useExploreSearch.ts` only if it should appear in search.
 * 3. Add the section to `DEFAULT_HOME_ORDER` and/or `DEFAULT_SEARCH_ORDER` as needed, or to the matching tab panel’s colocated section hook under `tabs/<TabName>/`
 *
 * The section will automatically appear in:
 * - The **Now** tab (via `DEFAULT_HOME_ORDER` / `tabs/Now/NowTabPanel`); `sites` is only on the Crypto tab. **Stocks** appears on both **Now** and **RWAs** where applicable
 * - Other tab hooks when you list them
 * - Search results
 * - Section headers with "View All" navigation
 */

/**
 * Default filter context for tokens in the Trending View home section.
 * Used for analytics tracking of token clicks from the home page.
 */
export const DEFAULT_TOKENS_FILTER_CONTEXT: TrendingFilterContext = {
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

const CRYPTO_MOVERS_SEARCH_FILTER_CONTEXT: TrendingFilterContext = {
  timeFilter: TimeOption.TwentyFourHours,
  sortOption: PriceChangeOption.Volume,
  networkFilter: 'all',
  isSearchResult: true,
};

/**
 * Explore home tabs (order matches {@link DEFAULT_HOME_ORDER} / feed tabs in TrendingView).
 * Each tab has its own section list; only `now` is wired today — other tabs are placeholders.
 */
export type ExploreTabId =
  | 'now'
  | 'macro'
  | 'rwas'
  | 'crypto'
  | 'sports'
  | 'dapps';

const sortPerpsByVolumeDesc = (a: PerpsMarketData, b: PerpsMarketData) => {
  const av = (a as PerpsMarketDataWithVolumeNumber).volumeNumber ?? 0;
  const bv = (b as PerpsMarketDataWithVolumeNumber).volumeNumber ?? 0;
  return bv - av;
};

const topThreePerpsByType = (
  list: PerpsMarketData[],
  type: 'equity' | 'commodity',
) =>
  list
    .filter((m) => m.marketType === type)
    .sort(sortPerpsByVolumeDesc)
    .slice(0, 3);

const getMacroPillToggledTabs = (
  markets: PerpsMarketData[],
): PillToggledTab[] => [
  {
    key: 'stocks',
    name: strings('trending.macro_pill_stocks'),
    items: topThreePerpsByType(markets, 'equity'),
  },
  {
    key: 'commodities',
    name: strings('trending.macro_pill_commodities'),
    items: topThreePerpsByType(markets, 'commodity'),
  },
];

const sortPerpsByChange24hDesc = (a: PerpsMarketData, b: PerpsMarketData) =>
  (parseFloat(b.change24hPercent) || 0) - (parseFloat(a.change24hPercent) || 0);

const topThreeRwaPerpsByType = (
  list: PerpsMarketData[],
  type: 'commodity' | 'equity' | 'forex',
) =>
  list
    .filter((m) => m.marketType === type)
    .sort(sortPerpsByChange24hDesc)
    .slice(0, 3);

const getRwaPillToggledTabs = (
  markets: PerpsMarketData[],
): PillToggledTab[] => [
  {
    key: 'commodities',
    name: strings('trending.rwa_pill_commodities'),
    items: topThreeRwaPerpsByType(markets, 'commodity'),
  },
  {
    key: 'stocks',
    name: strings('trending.rwa_pill_stocks'),
    items: topThreeRwaPerpsByType(markets, 'equity'),
  },
  {
    key: 'forex',
    name: strings('trending.rwa_pill_forex'),
    items: topThreeRwaPerpsByType(markets, 'forex'),
  },
];

/** Shared shell: perp feed `data` → tabbed pills + one `PillToggledCardSection` per `buildPills` implementation. */
const PerpsPillToggles: React.FC<{
  sectionId: SectionId;
  data: unknown[];
  isLoading: boolean;
  buildPills: (markets: PerpsMarketData[]) => PillToggledTab[];
  testIdPrefix: string;
  listTestId: string;
  defaultPillKey?: string;
}> = ({
  sectionId,
  data,
  isLoading,
  buildPills,
  testIdPrefix,
  listTestId,
  defaultPillKey,
}) => {
  const pills = useMemo(
    () => buildPills((data as PerpsMarketData[]) ?? []),
    [data, buildPills],
  );

  return (
    <PillToggledCardSection
      sectionId={sectionId}
      isLoading={isLoading}
      pills={pills}
      defaultPillKey={defaultPillKey}
      testIdPrefix={testIdPrefix}
      listTestId={listTestId}
    />
  );
};

const pillToggledStocksCommodityPerps: React.FC<{
  sectionId: SectionId;
  data: unknown[];
  isLoading: boolean;
}> = (props) => (
  <PerpsPillToggles
    {...props}
    buildPills={getMacroPillToggledTabs}
    testIdPrefix="macro-stocks-commodity-pills"
    listTestId="macro-stocks-commodity-perps-list"
  />
);

const pillToggledRwaPerps: React.FC<{
  sectionId: SectionId;
  data: unknown[];
  isLoading: boolean;
}> = (props) => (
  <PerpsPillToggles
    {...props}
    buildPills={getRwaPillToggledTabs}
    testIdPrefix="rwa-perps-pills"
    listTestId="rwa-perps-pill-toggled-list"
  />
);

const usePerpsMarketTileExtra = (items: unknown[]) => {
  const symbols = useMemo(
    () => (items as PerpsMarketData[]).map((m) => m.symbol),
    [items],
  );
  const { sparklines } = useHomepageSparklines(symbols);
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets) ?? [];
  return { sparklines, watchlistSymbols };
};

const makePerpsMarketTileRowItem =
  (testIDPrefix: string): SectionConfig['RowItem'] =>
  ({ item, index: _index, navigation, extra }) => {
    const { sparklines = {}, watchlistSymbols = [] } = (extra ?? {}) as {
      sparklines?: Record<string, number[]>;
      watchlistSymbols?: string[];
    };
    const market = item as PerpsMarketData;
    return (
      <PerpsMarketTileCard
        market={market}
        sparklineData={sparklines[market.symbol]}
        showFavoriteTag={watchlistSymbols.includes(market.symbol)}
        testID={`${testIDPrefix}-${market.symbol}`}
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

const sessionManager = TrendingFeedSessionManager.getInstance();

const TrendingTokenTileItem: React.FC<{
  item: unknown;
  index: number;
  navigation: AppNavigationProp;
  extra?: unknown;
}> = ({ item, index, navigation, extra }) => {
  const token = item as TrendingAsset;
  const sparklines =
    (extra as { sparklines?: Record<string, number[]> })?.sparklines ?? {};
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  const { addPopularNetwork } = useAddPopularNetwork();

  const onPress = useCallback(async () => {
    const assetParams = getAssetNavigationParams(
      token,
      TokenDetailsSource.Trending,
    );
    if (!assetParams) return;

    const caipChainId = token.assetId.split('/')[0];
    const key = getPriceChangeFieldKey(TimeOption.TwentyFourHours);
    const rawPct = token.priceChangePct?.[key];
    const pricePercentChange = rawPct ? parseFloat(String(rawPct)) : 0;

    sessionManager.trackTokenClick({
      token_symbol: token.symbol,
      token_address: assetParams.address,
      token_name: token.name,
      chain_id: assetParams.chainId,
      position: index,
      price_usd: parseFloat(token.price) || 0,
      price_change_pct: pricePercentChange,
      time_filter: DEFAULT_TOKENS_FILTER_CONTEXT.timeFilter,
      sort_option:
        DEFAULT_TOKENS_FILTER_CONTEXT.sortOption ??
        PriceChangeOption.PriceChange,
      network_filter: DEFAULT_TOKENS_FILTER_CONTEXT.networkFilter,
      is_search_result: DEFAULT_TOKENS_FILTER_CONTEXT.isSearchResult,
    });

    const isNetworkAdded = isCaipChainId(caipChainId)
      ? Boolean(networkConfigurations[caipChainId as CaipChainId])
      : true;
    if (!isNetworkAdded) {
      const popularNetwork = PopularList.find(
        (n) => n.chainId === assetParams.chainId,
      );
      if (popularNetwork) {
        try {
          await addPopularNetwork(popularNetwork);
        } catch (error) {
          console.error('Failed to add network:', error);
          return;
        }
      }
    }

    navigation.dispatch(StackActions.push('Asset', assetParams));
  }, [token, index, navigation, networkConfigurations, addPopularNetwork]);

  return (
    <TrendingTokenTileCard
      token={token}
      sparklineData={sparklines[token.assetId]}
      onPress={onPress}
      testID={`trending-token-tile-card-${token.assetId}`}
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
    RowItem: TrendingTokenTileItem,
    OverrideRowItemSearch: ({ item, index }) => (
      <TrendingTokenRowItem
        token={item as TrendingAsset}
        position={index}
        filterContext={SEARCH_TOKENS_FILTER_CONTEXT}
      />
    ),
    useTileExtra: (items) => {
      const { sparklines } = useTrendingTokenTileSparklines(
        items as TrendingAsset[],
      );
      return { sparklines };
    },
    Skeleton: TrendingTokenTileCardSkeleton,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    Section: TileSection,
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
  crypto_movers: {
    id: 'crypto_movers',
    title: strings('trending.crypto_movers'),
    icon: { source: 'design-system', name: DSIconName.Ethereum },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW);
    },
    getItemIdentifier: (item) => (item as Partial<TrendingAsset>).assetId ?? '',
    RowItem: CryptoMoversPillItem,
    OverrideRowItemSearch: ({ item, index }) => (
      <TrendingTokenRowItem
        token={item as TrendingAsset}
        position={index}
        filterContext={CRYPTO_MOVERS_SEARCH_FILTER_CONTEXT}
        testIdInstanceKey="crypto_movers"
      />
    ),
    Skeleton: SectionPillsSkeleton,
    Section: SectionPills,
    useSectionData: (searchQuery) => {
      const { data, isLoading, refetch } = useTrendingSearch({
        searchQuery,
        enableDebounce: false,
        sortTrendingTokensOptions: {
          option: PriceChangeOption.Volume,
          direction: SortDirection.Descending,
        },
      });
      const filteredData = useMemo(
        () =>
          fuseSearch(
            data,
            searchQuery,
            TOKEN_FUSE_OPTIONS,
            (a, b) =>
              (b.aggregatedUsdVolume ?? 0) - (a.aggregatedUsdVolume ?? 0),
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
    RowItem: makePerpsMarketTileRowItem('perps-market-tile-card'),
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
    useTileExtra: usePerpsMarketTileExtra,
    Skeleton: PerpsMarketTileCardSkeleton,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    SectionWrapper: ({ children }) => (
      <PerpsConnectionProvider suppressErrorView>
        <PerpsStreamProvider>{children}</PerpsStreamProvider>
      </PerpsConnectionProvider>
    ),
    Section: TileSection,
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
  rwa_perps: {
    id: 'rwa_perps',
    title: strings('trending.rwa_perps_section'),
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
    RowItem: ({ item, index: _index, navigation }) => (
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
    Skeleton: () => <PerpsRowSkeleton count={1} />,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    SectionWrapper: ({ children }) => (
      <PerpsConnectionProvider suppressErrorView>
        <PerpsStreamProvider>{children}</PerpsStreamProvider>
      </PerpsConnectionProvider>
    ),
    Section: pillToggledRwaPerps,
    useSectionData: (searchQuery) => {
      const connectionContext = useContext(PerpsConnectionContext);
      const { markets, isLoading, refresh, isRefreshing } = usePerpsMarkets();

      const filteredMarkets = useMemo(() => {
        if (connectionContext?.error) {
          return [];
        }
        const equityCommodityForex = markets.filter(
          (m) =>
            m.marketType === 'equity' ||
            m.marketType === 'commodity' ||
            m.marketType === 'forex',
        );
        if (!searchQuery) {
          return [...equityCommodityForex].sort(sortPerpsByChange24hDesc);
        }
        const filteredByQuery = filterMarketsByQuery(
          equityCommodityForex,
          searchQuery,
        );
        return fuseSearch(filteredByQuery, searchQuery, PERPS_FUSE_OPTIONS);
      }, [markets, searchQuery, connectionContext?.error]);

      return {
        data: filteredMarkets,
        isLoading: connectionContext?.error ? false : isLoading || isRefreshing,
        refetch: refresh,
      };
    },
  },
  /**
   * Macro tab: perps for **stocks (equity)** and **commodities** only, sorted by 24h volume (high → low).
   */
  macro_stocks_commodity_perps: {
    id: 'macro_stocks_commodity_perps',
    title: strings('trending.macro_stocks_commodity_perps'),
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
    RowItem: ({ item, index: _index, navigation }) => (
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
    Skeleton: () => <PerpsRowSkeleton count={1} />,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    SectionWrapper: ({ children }) => (
      <PerpsConnectionProvider suppressErrorView>
        <PerpsStreamProvider>{children}</PerpsStreamProvider>
      </PerpsConnectionProvider>
    ),
    Section: pillToggledStocksCommodityPerps,
    useSectionData: (searchQuery) => {
      const connectionContext = useContext(PerpsConnectionContext);
      const { markets, isLoading, refresh, isRefreshing } = usePerpsMarkets();

      const filteredMarkets = useMemo(() => {
        const sortByVolumeDesc = (a: PerpsMarketData, b: PerpsMarketData) => {
          const av = (a as PerpsMarketDataWithVolumeNumber).volumeNumber ?? 0;
          const bv = (b as PerpsMarketDataWithVolumeNumber).volumeNumber ?? 0;
          return bv - av;
        };
        if (connectionContext?.error) {
          return [];
        }
        const stocksAndCommodities = markets.filter(
          (m) => m.marketType === 'equity' || m.marketType === 'commodity',
        );
        if (!searchQuery) {
          return [...stocksAndCommodities].sort(sortByVolumeDesc);
        }
        const filteredByQuery = filterMarketsByQuery(
          stocksAndCommodities,
          searchQuery,
        );
        return [
          ...fuseSearch(filteredByQuery, searchQuery, PERPS_FUSE_OPTIONS),
        ].sort(sortByVolumeDesc);
      }, [markets, searchQuery, connectionContext?.error]);

      return {
        data: filteredMarkets,
        isLoading: connectionContext?.error ? false : isLoading || isRefreshing,
        refetch: refresh,
      };
    },
  },
  crypto_perps: {
    id: 'crypto_perps',
    title: strings('trending.crypto_perps_section'),
    icon: { source: 'design-system', name: DSIconName.Candlestick },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          defaultMarketTypeFilter: 'crypto',
          source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
        },
      });
    },
    getItemIdentifier: (item) =>
      (item as Partial<PerpsMarketData>).symbol ?? '',
    RowItem: makePerpsMarketTileRowItem('crypto-tab-perps-market-tile-card'),
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
    useTileExtra: usePerpsMarketTileExtra,
    Skeleton: PerpsMarketTileCardSkeleton,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    SectionWrapper: ({ children }) => (
      <PerpsConnectionProvider suppressErrorView>
        <PerpsStreamProvider>{children}</PerpsStreamProvider>
      </PerpsConnectionProvider>
    ),
    Section: TileSection,
    useSectionData: (searchQuery) => {
      const connectionContext = useContext(PerpsConnectionContext);
      const { markets, isLoading, refresh, isRefreshing } = usePerpsMarkets();

      const filteredMarkets = useMemo(() => {
        if (connectionContext?.error) {
          return [];
        }
        // Aligned with Perps market list “crypto” filter: main DEX (non–HIP-3) markets
        const cryptoPerps = markets.filter((m) => !m.isHip3);
        if (!searchQuery) {
          return [...cryptoPerps].sort(
            (a, b) =>
              (parseFloat(b.change24hPercent) || 0) -
              (parseFloat(a.change24hPercent) || 0),
          );
        }
        const filteredByQuery = filterMarketsByQuery(cryptoPerps, searchQuery);
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
    RowItem: TrendingTokenTileItem,
    OverrideRowItemSearch: ({ item, index }) => (
      <TrendingTokenRowItem
        token={item as TrendingAsset}
        position={index}
        filterContext={SEARCH_TOKENS_FILTER_CONTEXT}
      />
    ),
    useTileExtra: (items) => {
      const { sparklines } = useTrendingTokenTileSparklines(
        items as TrendingAsset[],
      );
      return { sparklines };
    },
    Skeleton: TrendingTokenTileCardSkeleton,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    Section: TileSection,
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
  sports_predictions: {
    id: 'sports_predictions',
    title: strings('predict.category.sports'),
    icon: { source: 'design-system', name: DSIconName.Speedometer },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: { tab: 'sports' },
      });
    },
    getItemIdentifier: (item) => (item as Partial<PredictMarketType>).id ?? '',
    RowItem: ({ item, index: _index }) => (
      <Box twClassName="py-2">
        <PredictMarket
          market={item as PredictMarketType}
          isCarousel
          testID={`predict-sports-market-row-item-${(item as PredictMarketType).id}`}
        />
      </Box>
    ),
    OverrideRowItemSearch: ({ item }) => (
      <PredictMarketRowItem market={item as PredictMarketType} />
    ),
    Skeleton: () => <PredictMarketSkeleton isCarousel />,
    OverrideSkeletonSearch: SiteSkeleton,
    Section: SectionCarrousel,
    useSectionData: (searchQuery) => {
      const { marketData, isFetching, refetch } = usePredictMarketData({
        category: 'sports',
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
  crypto_predictions: {
    id: 'crypto_predictions',
    title: strings('predict.category.crypto'),
    icon: { source: 'design-system', name: DSIconName.Speedometer },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: { tab: 'crypto' },
      });
    },
    getItemIdentifier: (item) => (item as Partial<PredictMarketType>).id ?? '',
    RowItem: ({ item, index: _index }) => (
      <Box twClassName="py-2">
        <PredictMarket
          market={item as PredictMarketType}
          isCarousel
          testID={`predict-crypto-market-row-item-${(item as PredictMarketType).id}`}
        />
      </Box>
    ),
    OverrideRowItemSearch: ({ item }) => (
      <PredictMarketRowItem market={item as PredictMarketType} />
    ),
    Skeleton: () => <PredictMarketSkeleton isCarousel />,
    OverrideSkeletonSearch: SiteSkeleton,
    Section: SectionCarrousel,
    useSectionData: (searchQuery) => {
      const { marketData, isFetching, refetch } = usePredictMarketData({
        category: 'crypto',
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
  politics_predictions: {
    id: 'politics_predictions',
    title: strings('predict.category.politics'),
    icon: { source: 'design-system', name: DSIconName.Speedometer },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: { tab: 'politics' },
      });
    },
    getItemIdentifier: (item) => (item as Partial<PredictMarketType>).id ?? '',
    RowItem: ({ item, index: _index }) => (
      <Box twClassName="py-2">
        <PredictMarket
          market={item as PredictMarketType}
          isCarousel
          testID={`predict-rwa-politics-market-row-item-${(item as PredictMarketType).id}`}
        />
      </Box>
    ),
    OverrideRowItemSearch: ({ item }) => (
      <PredictMarketRowItem market={item as PredictMarketType} />
    ),
    Skeleton: () => <PredictMarketSkeleton isCarousel />,
    OverrideSkeletonSearch: SiteSkeleton,
    Section: SectionCarrousel,
    useSectionData: (searchQuery) => {
      const { marketData, isFetching, refetch } = usePredictMarketData({
        category: 'politics',
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
  dapps_recents: {
    id: 'dapps_recents',
    title: strings('autocomplete.recents'),
    icon: { source: 'design-system', name: DSIconName.Global },
    showViewAllInHeader: false,
    showViewMoreTile: false,
    viewAllAction: (_navigation) => {
      /* Section has no "view all" — required by config shape */
    },
    getItemIdentifier: (item) => (item as Partial<SiteData>).url ?? '',
    RowItem: SiteRecentsTileRowItem,
    Skeleton: SiteRecentsTileSkeleton,
    Section: TileSection,
    useSectionData: () => {
      const { data, isLoading, refetch } = useBrowserRecentsSites();
      return { data, isLoading, refetch };
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

export const DEFAULT_HOME_ORDER: SectionId[] = [
  SECTIONS_CONFIG.predictions.id,
  SECTIONS_CONFIG.tokens.id,
  SECTIONS_CONFIG.crypto_movers.id,
  SECTIONS_CONFIG.perps.id,
  SECTIONS_CONFIG.stocks.id,
];

/** Section order for Explore omni-search (see `useExploreSearchSectionsData` in useExploreSearch.ts). */
export const DEFAULT_SEARCH_ORDER: SectionId[] = [
  SECTIONS_CONFIG.tokens.id,
  SECTIONS_CONFIG.perps.id,
  SECTIONS_CONFIG.stocks.id,
  SECTIONS_CONFIG.predictions.id,
  SECTIONS_CONFIG.sites.id,
];

export const buildSections = (
  order: SectionId[],
  isPerpsEnabled: boolean,
): (SectionConfig & { id: SectionId })[] =>
  order
    .filter((id) => isPerpsEnabled || id !== 'perps')
    .map((id) => SECTIONS_CONFIG[id]);

export const useSearchSectionsArray = (): (SectionConfig & {
  id: SectionId;
})[] => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  return useMemo(
    () => buildSections(DEFAULT_SEARCH_ORDER, isPerpsEnabled),
    [isPerpsEnabled],
  );
};
