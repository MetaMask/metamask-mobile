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
  renderRowItem: (
    item: unknown,
    navigation: NavigationProp<ParamListBase>,
  ) => JSX.Element;
  renderSkeleton: () => JSX.Element;
  getSearchableText: (item: unknown) => string;
  keyExtractor: (item: unknown) => string;
  renderSection: () => JSX.Element;
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
    renderRowItem: (item) => (
      <TrendingTokenRowItem
        token={item as TrendingAsset}
        onPress={() => undefined}
      />
    ),
    renderSkeleton: () => <TrendingTokensSkeleton />,
    getSearchableText: (item) =>
      `${(item as TrendingAsset).symbol} ${(item as TrendingAsset).name}`.toLowerCase(),
    keyExtractor: (item) => `token-${(item as TrendingAsset).assetId}`,
    renderSection: () => {
      const TrendingTokensSection = () => {
        const { results: trendingTokensResults, isLoading } =
          useTrendingRequest({});
        const trendingTokens = trendingTokensResults.slice(0, 3);

        return (
          <SectionCard
            sectionId="tokens"
            isLoading={isLoading || trendingTokens.length === 0}
            data={trendingTokens}
          />
        );
      };

      return <TrendingTokensSection />;
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
    renderRowItem: (item, navigation) => (
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
    renderSkeleton: () => <PerpsMarketRowSkeleton />,
    getSearchableText: (item) =>
      `${(item as PerpsMarketData).symbol} ${(item as PerpsMarketData).name || ''}`.toLowerCase(),
    keyExtractor: (item) => `perp-${(item as PerpsMarketData).symbol}`,
    renderSection: () => {
      const PerpsSection = () => {
        const { markets, isLoading } = usePerpsMarkets();
        const perpsTokens = markets.slice(0, 3);

        return (
          <SectionCard
            sectionId="perps"
            isLoading={isLoading || perpsTokens.length === 0}
            data={perpsTokens}
          />
        );
      };

      return (
        <PerpsConnectionProvider>
          <PerpsStreamProvider>
            <PerpsSection />
          </PerpsStreamProvider>
        </PerpsConnectionProvider>
      );
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
    renderRowItem: (item) => (
      <PredictMarket market={item as PredictMarketType} />
    ),
    renderSkeleton: () => <PredictMarketSkeleton />,
    getSearchableText: (item) =>
      (item as PredictMarketType).title.toLowerCase(),
    keyExtractor: (item) => `prediction-${(item as PredictMarketType).id}`,
    renderSection: () => {
      const PredictionSection = () => {
        const { marketData, isFetching } = usePredictMarketData({
          category: 'trending',
          pageSize: 6,
        });

        return (
          <SectionCarrousel
            sectionId="predictions"
            isLoading={isFetching || marketData?.length === 0}
            data={marketData}
            showPagination
            testIDPrefix="prediction-carousel"
          />
        );
      };

      return <PredictionSection />;
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
  const { results: trendingTokens, isLoading: isTokensLoading } =
    useTrendingRequest({});

  const { markets: perpsMarkets, isLoading: isPerpsLoading } =
    usePerpsMarkets();

  const { marketData: predictionMarkets, isFetching: isPredictionsLoading } =
    usePredictMarketData({
      category: 'trending',
      q: searchQuery || undefined,
      pageSize: searchQuery ? 20 : 3,
    });

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
