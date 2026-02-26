import { SortTrendingBy } from '@metamask/assets-controllers';
import { CaipChainId, Hex, parseCaipChainId } from '@metamask/utils';
import { useCallback, useMemo, useState } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { PopularList } from '../../../../../util/networks/customNetworks';
import {
  PriceChangeOption,
  SortDirection,
  TimeOption,
  mapTimeOptionToSortBy,
} from '../../components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../components/TrendingTokensList/TrendingTokensList';

const PRICE_CHANGE_LABELS: Record<PriceChangeOption, string> = {
  [PriceChangeOption.PriceChange]: 'trending.price_change',
  [PriceChangeOption.Volume]: 'trending.volume',
  [PriceChangeOption.MarketCap]: 'trending.market_cap',
};

export interface UseTrendingFiltersParams {
  networkConfigurations: Record<CaipChainId, { name?: string } | undefined>;
  isSearchResult?: boolean;
}

export const useTrendingFilters = ({
  networkConfigurations,
  isSearchResult = false,
}: UseTrendingFiltersParams) => {
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

  const sortBy = useMemo(
    () => mapTimeOptionToSortBy(selectedTimeOption),
    [selectedTimeOption],
  );

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

  const filterContext: TrendingFilterContext = useMemo(
    () => ({
      timeFilter: selectedTimeOption,
      sortOption: selectedPriceChangeOption,
      networkFilter:
        selectedNetwork && selectedNetwork.length > 0
          ? selectedNetwork[0]
          : 'all',
      isSearchResult,
    }),
    [
      selectedTimeOption,
      selectedPriceChangeOption,
      selectedNetwork,
      isSearchResult,
    ],
  );

  const priceChangeButtonText = strings(
    PRICE_CHANGE_LABELS[
      selectedPriceChangeOption ?? PriceChangeOption.PriceChange
    ],
  );

  const handlePriceChangeSelect = useCallback(
    (option: PriceChangeOption, sortDirection: SortDirection) => {
      setSelectedPriceChangeOption(option);
      setPriceChangeSortDirection(sortDirection);
    },
    [],
  );

  const handleTimeSelect = useCallback(
    (_sortBy: SortTrendingBy, timeOption: TimeOption) => {
      setSelectedTimeOption(timeOption);
    },
    [],
  );

  return {
    selectedTimeOption,
    selectedNetwork,
    selectedPriceChangeOption,
    priceChangeSortDirection,
    sortBy,
    selectedNetworkName,
    priceChangeButtonText,
    filterContext,
    handlePriceChangeSelect,
    handleNetworkSelect: setSelectedNetwork,
    handleTimeSelect,
  };
};
