import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import {
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../components/TrendingTokensList/TrendingTokensList';
import TrendingFeedSessionManager from '../../services/TrendingFeedSessionManager';
import { useNetworkName } from '../useNetworkName/useNetworkName';

interface UseTokenListFiltersOptions {
  /**
   * Fixed time option when the view doesn't support time selection.
   * When provided, the time filter is static and no time bottom sheet is shown.
   */
  timeOption?: TimeOption;
}

export interface TokenListFilters {
  // Navigation
  handleBackPress: () => void;

  // Search
  isSearchVisible: boolean;
  searchQuery: string;
  handleSearchToggle: () => void;
  handleSearchQueryChange: (query: string) => void;

  // Network
  selectedNetwork: CaipChainId[] | null;
  selectedNetworkName: string;
  showNetworkBottomSheet: boolean;
  setShowNetworkBottomSheet: (visible: boolean) => void;
  handleNetworkSelect: (chainIds: CaipChainId[] | null) => void;
  handleAllNetworksPress: () => void;

  // Price change / sort
  selectedPriceChangeOption: PriceChangeOption | undefined;
  priceChangeSortDirection: SortDirection;
  showPriceChangeBottomSheet: boolean;
  setShowPriceChangeBottomSheet: (visible: boolean) => void;
  handlePriceChangeSelect: (
    option: PriceChangeOption,
    sortDirection: SortDirection,
  ) => void;
  handlePriceChangePress: () => void;
  priceChangeButtonText: string;

  // Time
  selectedTimeOption: TimeOption;
  setSelectedTimeOption: (timeOption: TimeOption) => void;

  // Refresh
  refreshing: boolean;
  setRefreshing: (refreshing: boolean) => void;

  // Analytics filter context
  filterContext: TrendingFilterContext;
}

/**
 * Manages all filter-related state and handlers shared across token list views
 * (TrendingTokensFullView, RWATokensFullView).
 */
export const useTokenListFilters = (
  options: UseTokenListFiltersOptions = {},
): TokenListFilters => {
  const { timeOption } = options;

  const navigation =
    useNavigation<StackNavigationProp<Record<string, undefined | object>>>();
  const sessionManager = TrendingFeedSessionManager.getInstance();

  const [selectedNetwork, setSelectedNetwork] = useState<CaipChainId[] | null>(
    null,
  );
  const [selectedPriceChangeOption, setSelectedPriceChangeOption] = useState<
    PriceChangeOption | undefined
  >(PriceChangeOption.PriceChange);
  const [priceChangeSortDirection, setPriceChangeSortDirection] =
    useState<SortDirection>(SortDirection.Descending);
  const [showNetworkBottomSheet, setShowNetworkBottomSheet] = useState(false);
  const [showPriceChangeBottomSheet, setShowPriceChangeBottomSheet] =
    useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeOption, setSelectedTimeOption] = useState<TimeOption>(
    timeOption ?? TimeOption.TwentyFourHours,
  );

  const selectedNetworkName = useNetworkName(selectedNetwork);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSearchToggle = useCallback(() => {
    setIsSearchVisible((prev) => !prev);
    if (isSearchVisible) {
      setSearchQuery('');
    }
  }, [isSearchVisible]);

  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handlePriceChangeSelect = useCallback(
    (option: PriceChangeOption, sortDirection: SortDirection) => {
      const previousValue =
        selectedPriceChangeOption || PriceChangeOption.PriceChange;
      setSelectedPriceChangeOption(option);
      setPriceChangeSortDirection(sortDirection);

      if (option !== previousValue) {
        sessionManager.trackFilterChange({
          filter_type: 'sort',
          previous_value: previousValue,
          new_value: option,
          time_filter: selectedTimeOption,
          sort_option: option,
          network_filter:
            selectedNetwork && selectedNetwork.length > 0
              ? selectedNetwork[0]
              : 'all',
        });
      }
    },
    [
      selectedPriceChangeOption,
      selectedTimeOption,
      selectedNetwork,
      sessionManager,
    ],
  );

  const handlePriceChangePress = useCallback(() => {
    setShowPriceChangeBottomSheet(true);
  }, []);

  const handleNetworkSelect = useCallback(
    (chainIds: CaipChainId[] | null) => {
      const previousValue =
        selectedNetwork && selectedNetwork.length > 0
          ? selectedNetwork[0]
          : 'all';
      const newValue = chainIds && chainIds.length > 0 ? chainIds[0] : 'all';

      setSelectedNetwork(chainIds);

      if (newValue !== previousValue) {
        sessionManager.trackFilterChange({
          filter_type: 'network',
          previous_value: previousValue,
          new_value: newValue,
          time_filter: selectedTimeOption,
          sort_option:
            selectedPriceChangeOption || PriceChangeOption.PriceChange,
          network_filter: newValue,
        });
      }
    },
    [
      selectedNetwork,
      selectedTimeOption,
      selectedPriceChangeOption,
      sessionManager,
    ],
  );

  const handleAllNetworksPress = useCallback(() => {
    setShowNetworkBottomSheet(true);
  }, []);

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

  const filterContext: TrendingFilterContext = useMemo(
    () => ({
      timeFilter: selectedTimeOption,
      sortOption: selectedPriceChangeOption,
      networkFilter:
        selectedNetwork && selectedNetwork.length > 0
          ? selectedNetwork[0]
          : 'all',
      isSearchResult: Boolean(searchQuery?.trim()),
    }),
    [
      selectedTimeOption,
      selectedPriceChangeOption,
      selectedNetwork,
      searchQuery,
    ],
  );

  return {
    handleBackPress,
    isSearchVisible,
    searchQuery,
    handleSearchToggle,
    handleSearchQueryChange,
    selectedNetwork,
    selectedNetworkName,
    showNetworkBottomSheet,
    setShowNetworkBottomSheet,
    handleNetworkSelect,
    handleAllNetworksPress,
    selectedPriceChangeOption,
    priceChangeSortDirection,
    showPriceChangeBottomSheet,
    setShowPriceChangeBottomSheet,
    handlePriceChangeSelect,
    handlePriceChangePress,
    priceChangeButtonText,
    selectedTimeOption,
    setSelectedTimeOption,
    refreshing,
    setRefreshing,
    filterContext,
  };
};
