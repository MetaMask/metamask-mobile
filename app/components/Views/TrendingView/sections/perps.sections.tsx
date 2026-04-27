import React, { useContext, useMemo, type PropsWithChildren } from 'react';
import { NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { IconName as DSIconName } from '@metamask/design-system-react-native';
import {
  filterMarketsByQuery,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { usePerpsMarkets } from '../../../UI/Perps/hooks';
import type { PerpsMarketDataWithVolumeNumber } from '../../../UI/Perps/hooks/usePerpsMarkets';
import {
  PerpsConnectionContext,
  PerpsConnectionProvider,
} from '../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../UI/Perps/providers/PerpsStreamManager';
import PerpsMarketRowItem from '../../../UI/Perps/components/PerpsMarketRowItem';
import PerpsRowSkeleton from '../../../UI/Perps/components/PerpsRowSkeleton';
import PerpsMarketTileCard from '../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCard';
import PerpsMarketTileCardSkeleton from '../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCardSkeleton';
import { useHomepageSparklines } from '../../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines';
import { selectPerpsWatchlistMarkets } from '../../../UI/Perps/selectors/perpsController';
import TrendingTokensSkeleton from '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import TileSection from '../components/Sections/SectionTypes/TileSection';
import PillToggledCardSection, {
  type PillToggledTab,
} from '../components/Sections/SectionTypes/PillToggledCardSection';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { fuseSearch, PERPS_FUSE_OPTIONS } from './search-utils';
import type { RowItemSearchProps, SectionConfig, SectionId } from './types';

// ─── Shared provider wrapper ──────────────────────────────────────────────────

const PerpsSectionWrapper: React.FC<PropsWithChildren> = ({ children }) => (
  <PerpsConnectionProvider suppressErrorView>
    <PerpsStreamProvider>{children}</PerpsStreamProvider>
  </PerpsConnectionProvider>
);

// ─── Shared tile extra hook ───────────────────────────────────────────────────

const usePerpsMarketTileExtra = (items: unknown[]) => {
  const symbols = useMemo(
    () => (items as PerpsMarketData[]).map((m) => m.symbol),
    [items],
  );
  const { sparklines } = useHomepageSparklines(symbols);
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets) ?? [];
  return { sparklines, watchlistSymbols };
};

// ─── Shared tile RowItem ──────────────────────────────────────────────────────

const PerpsMarketTileRowItem =
  (testIDPrefix: string): SectionConfig['RowItem'] =>
  ({ item, navigation, extra }) => {
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
              params: { market, source: PERPS_EVENT_VALUE.SOURCE.EXPLORE },
            },
          );
        }}
      />
    );
  };

// ─── Shared compact list RowItem (used by all perps in home pill-toggled + search) ─

const PerpsMarketCompactRowContent: React.FC<RowItemSearchProps> = ({
  item,
  navigation,
}) => {
  const market = item as PerpsMarketData;
  return (
    <PerpsMarketRowItem
      market={market}
      onPress={() => {
        (navigation as NavigationProp<PerpsNavigationParamList>)?.navigate(
          Routes.PERPS.ROOT,
          {
            screen: Routes.PERPS.MARKET_DETAILS,
            params: { market, source: PERPS_EVENT_VALUE.SOURCE.EXPLORE },
          },
        );
      }}
      showBadge={false}
      compact
    />
  );
};

const PerpsMarketCompactRowItem: SectionConfig['RowItem'] = (props) => (
  <PerpsMarketCompactRowContent {...props} />
);

// ─── Sort helpers ─────────────────────────────────────────────────────────────

const sortPerpsByVolumeDesc = (a: PerpsMarketData, b: PerpsMarketData) => {
  const av = (a as PerpsMarketDataWithVolumeNumber).volumeNumber ?? 0;
  const bv = (b as PerpsMarketDataWithVolumeNumber).volumeNumber ?? 0;
  return bv - av;
};

const sortPerpsByChange24hDesc = (a: PerpsMarketData, b: PerpsMarketData) =>
  (parseFloat(b.change24hPercent) || 0) - (parseFloat(a.change24hPercent) || 0);

const topThreeByType = (
  list: PerpsMarketData[],
  type: string,
  sortFn: (a: PerpsMarketData, b: PerpsMarketData) => number,
) =>
  list
    .filter((m) => m.marketType === type)
    .sort(sortFn)
    .slice(0, 3);

// ─── Pill tab builders ────────────────────────────────────────────────────────

const getMacroPillToggledTabs = (
  markets: PerpsMarketData[],
): PillToggledTab[] => [
  {
    key: 'stocks',
    name: strings('trending.macro_pill_stocks'),
    items: topThreeByType(markets, 'equity', sortPerpsByVolumeDesc),
  },
  {
    key: 'commodities',
    name: strings('trending.macro_pill_commodities'),
    items: topThreeByType(markets, 'commodity', sortPerpsByVolumeDesc),
  },
];

const getRwaPillToggledTabs = (
  markets: PerpsMarketData[],
): PillToggledTab[] => [
  {
    key: 'commodities',
    name: strings('trending.rwa_pill_commodities'),
    items: topThreeByType(markets, 'commodity', sortPerpsByChange24hDesc),
  },
  {
    key: 'stocks',
    name: strings('trending.rwa_pill_stocks'),
    items: topThreeByType(markets, 'equity', sortPerpsByChange24hDesc),
  },
  {
    key: 'forex',
    name: strings('trending.rwa_pill_forex'),
    items: topThreeByType(markets, 'forex', sortPerpsByChange24hDesc),
  },
];

// ─── Pill-toggle Section renderers ───────────────────────────────────────────

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

const PillToggledStocksCommodityPerps: React.FC<{
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

const PillToggledRwaPerps: React.FC<{
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

// ─── Shared perps useSectionData factory ─────────────────────────────────────

const makePerpsUseSectionData =
  (
    filterFn: (
      markets: PerpsMarketData[],
      searchQuery?: string,
    ) => PerpsMarketData[],
  ): SectionConfig['useSectionData'] =>
  (searchQuery) => {
    const connectionContext = useContext(PerpsConnectionContext);
    const { markets, isLoading, refresh, isRefreshing } = usePerpsMarkets();
    const filteredMarkets = useMemo(() => {
      if (connectionContext?.error) return [];
      return filterFn(markets, searchQuery);
    }, [markets, searchQuery, connectionContext?.error]);
    return {
      data: filteredMarkets,
      isLoading: connectionContext?.error ? false : isLoading || isRefreshing,
      refetch: refresh,
    };
  };

const perpsNavigationTo = (
  navigation: NavigationProp<PerpsNavigationParamList>,
  filter: string = 'all',
) => {
  navigation.navigate(Routes.PERPS.ROOT, {
    screen: Routes.PERPS.MARKET_LIST,
    params: {
      defaultMarketTypeFilter: filter,
      source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
    },
  });
};

// ─── Section configs ──────────────────────────────────────────────────────────

export const perpsSections = {
  perps: {
    id: 'perps',
    title: strings('trending.perps'),
    icon: { source: 'design-system', name: DSIconName.Candlestick },
    viewAllAction: (navigation) =>
      perpsNavigationTo(navigation as NavigationProp<PerpsNavigationParamList>),
    getItemIdentifier: (item) =>
      (item as Partial<PerpsMarketData>).symbol ?? '',
    RowItem: PerpsMarketTileRowItem('perps-market-tile-card'),
    OverrideRowItemSearch: PerpsMarketCompactRowContent,
    useTileExtra: usePerpsMarketTileExtra,
    Skeleton: PerpsMarketTileCardSkeleton,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    SectionWrapper: PerpsSectionWrapper,
    Section: TileSection,
    useSectionData: makePerpsUseSectionData((markets, searchQuery) => {
      if (!searchQuery) {
        return [...markets].sort(sortPerpsByChange24hDesc);
      }
      const filtered = filterMarketsByQuery(markets, searchQuery);
      return fuseSearch(filtered, searchQuery, PERPS_FUSE_OPTIONS);
    }),
  } satisfies SectionConfig,

  rwa_perps: {
    id: 'rwa_perps',
    title: strings('trending.rwa_perps_section'),
    icon: { source: 'design-system', name: DSIconName.Candlestick },
    viewAllAction: (navigation) =>
      perpsNavigationTo(navigation as NavigationProp<PerpsNavigationParamList>),
    getItemIdentifier: (item) =>
      (item as Partial<PerpsMarketData>).symbol ?? '',
    RowItem: PerpsMarketCompactRowItem,
    OverrideRowItemSearch: PerpsMarketCompactRowContent,
    Skeleton: () => <PerpsRowSkeleton count={1} />,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    SectionWrapper: PerpsSectionWrapper,
    Section: PillToggledRwaPerps,
    useSectionData: makePerpsUseSectionData((markets, searchQuery) => {
      const rwas = markets.filter(
        (m) =>
          m.marketType === 'equity' ||
          m.marketType === 'commodity' ||
          m.marketType === 'forex',
      );
      if (!searchQuery) return [...rwas].sort(sortPerpsByChange24hDesc);
      const filtered = filterMarketsByQuery(rwas, searchQuery);
      return fuseSearch(filtered, searchQuery, PERPS_FUSE_OPTIONS);
    }),
  } satisfies SectionConfig,

  macro_stocks_commodity_perps: {
    id: 'macro_stocks_commodity_perps',
    title: strings('trending.macro_stocks_commodity_perps'),
    icon: { source: 'design-system', name: DSIconName.Candlestick },
    viewAllAction: (navigation) =>
      perpsNavigationTo(navigation as NavigationProp<PerpsNavigationParamList>),
    getItemIdentifier: (item) =>
      (item as Partial<PerpsMarketData>).symbol ?? '',
    RowItem: PerpsMarketCompactRowItem,
    OverrideRowItemSearch: PerpsMarketCompactRowContent,
    Skeleton: () => <PerpsRowSkeleton count={1} />,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    SectionWrapper: PerpsSectionWrapper,
    Section: PillToggledStocksCommodityPerps,
    useSectionData: makePerpsUseSectionData((markets, searchQuery) => {
      const stocksAndCommodities = markets.filter(
        (m) => m.marketType === 'equity' || m.marketType === 'commodity',
      );
      if (!searchQuery)
        return [...stocksAndCommodities].sort(sortPerpsByVolumeDesc);
      const filtered = filterMarketsByQuery(stocksAndCommodities, searchQuery);
      return [...fuseSearch(filtered, searchQuery, PERPS_FUSE_OPTIONS)].sort(
        sortPerpsByVolumeDesc,
      );
    }),
  } satisfies SectionConfig,

  crypto_perps: {
    id: 'crypto_perps',
    title: strings('trending.crypto_perps_section'),
    icon: { source: 'design-system', name: DSIconName.Candlestick },
    viewAllAction: (navigation) => {
      (navigation as NavigationProp<PerpsNavigationParamList>).navigate(
        Routes.PERPS.ROOT,
        {
          screen: Routes.PERPS.MARKET_LIST,
          params: {
            defaultMarketTypeFilter: 'crypto',
            source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
          },
        },
      );
    },
    getItemIdentifier: (item) =>
      (item as Partial<PerpsMarketData>).symbol ?? '',
    RowItem: PerpsMarketTileRowItem('crypto-tab-perps-market-tile-card'),
    OverrideRowItemSearch: PerpsMarketCompactRowContent,
    useTileExtra: usePerpsMarketTileExtra,
    Skeleton: PerpsMarketTileCardSkeleton,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    SectionWrapper: PerpsSectionWrapper,
    Section: TileSection,
    useSectionData: makePerpsUseSectionData((markets, searchQuery) => {
      const cryptoPerps = markets.filter((m) => !m.isHip3);
      if (!searchQuery) return [...cryptoPerps].sort(sortPerpsByChange24hDesc);
      const filtered = filterMarketsByQuery(cryptoPerps, searchQuery);
      return fuseSearch(filtered, searchQuery, PERPS_FUSE_OPTIONS);
    }),
  } satisfies SectionConfig,
} satisfies Record<string, SectionConfig>;
