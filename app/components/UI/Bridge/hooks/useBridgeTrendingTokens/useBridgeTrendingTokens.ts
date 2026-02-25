import { SortTrendingBy } from '@metamask/assets-controllers';
import { CaipChainId, Hex, parseCaipChainId } from '@metamask/utils';
import { useCallback, useMemo, useState } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { PopularList } from '../../../../../util/networks/customNetworks';
import { useTrendingRequest } from '../../../Trending/hooks/useTrendingRequest/useTrendingRequest';
import {
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../../Trending/components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../../Trending/components/TrendingTokensList/TrendingTokensList';
import { sortTrendingTokens } from '../../../Trending/utils/sortTrendingTokens';

const DEFAULT_TRENDING_SORT_BY = 'h24_trending' as SortTrendingBy;

export interface UseBridgeTrendingTokensParams {
  networkConfigurations: Record<CaipChainId, { name?: string } | undefined>;
}

export const useBridgeTrendingTokens = ({
  networkConfigurations,
}: UseBridgeTrendingTokensParams) => {
  const [sortBy, setSortBy] = useState<SortTrendingBy | undefined>(undefined);
  const [selectedTimeOption, setSelectedTimeOption] = useState<TimeOption>(
    TimeOption.TwentyFourHours,
  );
  const [selectedNetwork, setSelectedNetwork] = useState<CaipChainId[] | null>(
    null,
  );
  const [selectedPriceChangeOption, setSelectedPriceChangeOption] = useState<
    PriceChangeOption | undefined
  >(PriceChangeOption.PriceChange);
  const [priceChangeSortDirection, setPriceChangeSortDirection] =
    useState<SortDirection>(SortDirection.Descending);

  const {
    results: trendingResults,
    isLoading,
    fetch: refetchTrendingTokens,
  } = useTrendingRequest({
    sortBy,
    chainIds: selectedNetwork ?? undefined,
  });

  const selectedNetworkName = useMemo(() => {
    if (!selectedNetwork || selectedNetwork.length === 0) {
      return strings('trending.all_networks');
    }

    const selectedNetworkChainId = selectedNetwork[0];
    const networkConfig = networkConfigurations[selectedNetworkChainId];
    if (networkConfig?.name) {
      return networkConfig.name;
    }

    try {
      const { namespace, reference } = parseCaipChainId(selectedNetworkChainId);
      if (namespace === 'eip155') {
        const hexChainId = `0x${Number(reference).toString(16)}` as Hex;
        const popularNetwork = PopularList.find(
          (network) => network.chainId === hexChainId,
        );
        if (popularNetwork?.nickname) {
          return popularNetwork.nickname;
        }
      }
    } catch {
      // Fall through to all-networks label.
    }

    return strings('trending.all_networks');
  }, [selectedNetwork, networkConfigurations]);

  const trendingTokens = useMemo(() => {
    if (trendingResults.length === 0 || !selectedPriceChangeOption) {
      return trendingResults;
    }

    const isUsingDefaultSortBy = !sortBy || sortBy === DEFAULT_TRENDING_SORT_BY;
    const isUsingDefaultClientSort =
      selectedPriceChangeOption === PriceChangeOption.PriceChange &&
      priceChangeSortDirection === SortDirection.Descending &&
      selectedTimeOption === TimeOption.TwentyFourHours;

    if (isUsingDefaultSortBy && isUsingDefaultClientSort) {
      return trendingResults;
    }

    return sortTrendingTokens(
      trendingResults,
      selectedPriceChangeOption,
      priceChangeSortDirection,
      selectedTimeOption,
    );
  }, [
    trendingResults,
    selectedPriceChangeOption,
    priceChangeSortDirection,
    selectedTimeOption,
    sortBy,
  ]);

  const filterContext: TrendingFilterContext = useMemo(
    () => ({
      timeFilter: selectedTimeOption,
      sortOption: selectedPriceChangeOption,
      networkFilter:
        selectedNetwork && selectedNetwork.length > 0
          ? selectedNetwork[0]
          : 'all',
      isSearchResult: false,
    }),
    [selectedTimeOption, selectedPriceChangeOption, selectedNetwork],
  );

  const priceChangeButtonText = useMemo(() => {
    switch (selectedPriceChangeOption) {
      case PriceChangeOption.Volume:
        return strings('trending.volume');
      case PriceChangeOption.MarketCap:
        return strings('trending.market_cap');
      case PriceChangeOption.PriceChange:
      default:
        return strings('trending.price_change');
    }
  }, [selectedPriceChangeOption]);

  const handlePriceChangeSelect = useCallback(
    (option: PriceChangeOption, sortDirection: SortDirection) => {
      setSelectedPriceChangeOption(option);
      setPriceChangeSortDirection(sortDirection);
    },
    [],
  );

  const handleNetworkSelect = useCallback((chainIds: CaipChainId[] | null) => {
    setSelectedNetwork(chainIds);
  }, []);

  const handleTimeSelect = useCallback(
    (selectedSortBy: SortTrendingBy, timeOption: TimeOption) => {
      setSortBy(selectedSortBy);
      setSelectedTimeOption(timeOption);
    },
    [],
  );

  return {
    sortBy,
    selectedTimeOption,
    selectedNetwork,
    selectedPriceChangeOption,
    priceChangeSortDirection,
    selectedNetworkName,
    priceChangeButtonText,
    filterContext,
    trendingTokens,
    isLoading,
    refetch: refetchTrendingTokens,
    handlePriceChangeSelect,
    handleNetworkSelect,
    handleTimeSelect,
  };
};
