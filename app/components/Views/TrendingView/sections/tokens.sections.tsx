import React, { useMemo } from 'react';
import { IconName as DSIconName } from '@metamask/design-system-react-native';
import { IconName as LocalIconName } from '../../../../component-library/components/Icons/Icon/Icon.types';
import type { TrendingAsset } from '@metamask/assets-controllers';
import TrendingTokenRowItem from '../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import {
  PriceChangeOption,
  SortDirection,
} from '../../../UI/Trending/components/TrendingTokensBottomSheet';
import { useTrendingSearch } from '../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import { useRwaTokens } from '../../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import TrendingTokenTileCard from '../components/Sections/SectionTypes/TrendingTokenTileCard/TrendingTokenTileCard';
import TrendingTokenTileCardSkeleton from '../components/Sections/SectionTypes/TrendingTokenTileCard/TrendingTokenTileCardSkeleton';
import { useTrendingTokenTileSparklines } from '../components/Sections/SectionTypes/TrendingTokenTileCard/useTrendingTokenTileSparklines';
import SectionPills from '../components/Sections/SectionTypes/SectionPills/SectionPills';
import SectionPillsSkeleton from '../components/Sections/SectionTypes/SectionPills/SectionPillsSkeleton';
import CryptoMoversPillItem from '../components/Sections/SectionTypes/CryptoMoversPillItem/CryptoMoversPillItem';
import TileSection from '../components/Sections/SectionTypes/TileSection';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import {
  fuseSearch,
  TOKEN_FUSE_OPTIONS,
  SEARCH_TOKENS_FILTER_CONTEXT,
  CRYPTO_MOVERS_SEARCH_FILTER_CONTEXT,
  DEFAULT_TOKENS_FILTER_CONTEXT,
} from './search-utils';
import { useTrendingTokenPress } from '../hooks/useTrendingTokenPress';
import type { SectionConfig } from './types';

// ─── Shared tile row item (tokens + stocks) ───────────────────────────────────

const TrendingTokenTileItem: SectionConfig['RowItem'] = ({
  item,
  index,
  extra,
}) => {
  const token = item as TrendingAsset;
  const sparklines =
    (extra as { sparklines?: Record<string, number[]> })?.sparklines ?? {};
  const { onPress } = useTrendingTokenPress({
    token,
    index,
    filterContext: DEFAULT_TOKENS_FILTER_CONTEXT,
  });
  return (
    <TrendingTokenTileCard
      token={token}
      sparklineData={sparklines[token.assetId]}
      onPress={onPress}
      testID={`trending-token-tile-card-${token.assetId}`}
    />
  );
};

// ─── Shared tile extra hook (tokens + stocks) ─────────────────────────────────

const useTrendingTileExtra = (items: unknown[]) => {
  const { sparklines } = useTrendingTokenTileSparklines(
    items as TrendingAsset[],
  );
  return { sparklines };
};

// ─── Section configs ──────────────────────────────────────────────────────────

export const tokensSections = {
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
    useTileExtra: useTrendingTileExtra,
    Skeleton: TrendingTokenTileCardSkeleton,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    Section: TileSection,
    useSectionData: (searchQuery) => {
      const { data, isLoading, refetch } = useTrendingSearch({
        searchQuery,
        enableDebounce: false,
      });
      const filteredData = useMemo(
        () =>
          fuseSearch(
            data,
            searchQuery,
            TOKEN_FUSE_OPTIONS,
            (a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0),
          ),
        [data, searchQuery],
      );
      return { data: filteredData, isLoading, refetch };
    },
  } satisfies SectionConfig,

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
  } satisfies SectionConfig,

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
    useTileExtra: useTrendingTileExtra,
    Skeleton: TrendingTokenTileCardSkeleton,
    OverrideSkeletonSearch: TrendingTokensSkeleton,
    Section: TileSection,
    useSectionData: (searchQuery) => {
      const { data, isLoading, refetch } = useRwaTokens({ searchQuery });
      return { data, isLoading, refetch };
    },
  } satisfies SectionConfig,
} satisfies Record<string, SectionConfig>;
