import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useAppThemeFromContext } from '../../../../util/theme';
import { Theme } from '../../../../util/theme/models';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../selectors/networkController';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import { TrendingListHeader } from '../../../UI/Trending/components/TrendingListHeader';
import TrendingTokensList, {
  TrendingFilterContext,
} from '../../../UI/Trending/components/TrendingTokensList/TrendingTokensList';
import TrendingTokensSkeleton from '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import {
  SortTrendingBy,
  type TrendingAsset,
} from '@metamask/assets-controllers';
import { CaipChainId, Hex, parseCaipChainId } from '@metamask/utils';
import { PopularList } from '../../../../util/networks/customNetworks';
import Text from '../../../../component-library/components/Texts/Text';
import {
  TrendingTokenTimeBottomSheet,
  TrendingTokenNetworkBottomSheet,
  TrendingTokenPriceChangeBottomSheet,
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../../UI/Trending/components/TrendingTokensBottomSheet';
import { sortTrendingTokens } from '../../../UI/Trending/utils/sortTrendingTokens';
import { useTrendingSearch } from '../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import EmptyErrorTrendingState from '../../TrendingView/components/EmptyErrorState/EmptyErrorTrendingState';
import EmptySearchResultState from '../../TrendingView/components/EmptyErrorState/EmptySearchResultState';
import TrendingFeedSessionManager from '../../../UI/Trending/services/TrendingFeedSessionManager';

interface TrendingTokensNavigationParamList {
  [key: string]: undefined | object;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    headerContainer: {
      backgroundColor: theme.colors.background.default,
    },
    cardContainer: {
      margin: 16,
      borderRadius: 16,
      backgroundColor: theme.colors.background.muted,
      padding: 16,
    },
    listContainer: {
      flex: 1,
      paddingLeft: 16,
      paddingRight: 16,
    },
    controlBarWrapper: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      flexGrow: 0,
    },
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    controlButtonInnerWrapper: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      flexShrink: 1,
      marginLeft: 8,
      minWidth: 0,
    },
    controlButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: theme.colors.background.muted,
    },
    controlButtonRight: {
      padding: 8,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: theme.colors.background.muted,
      flexShrink: 1,
      minWidth: 0,
    },
    controlButtonRightFixed: {
      padding: 8,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: theme.colors.background.muted,
      flexShrink: 0,
    },
    controlButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    controlButtonText: {
      color: theme.colors.text.default,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 19.6, // 140% of 14px
      fontStyle: 'normal',
      flexShrink: 1,
      minWidth: 0,
    },
    controlButtonDisabled: {
      opacity: 0.5,
    },
  });

const TrendingTokensFullView = () => {
  const navigation =
    useNavigation<StackNavigationProp<TrendingTokensNavigationParamList>>();
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const sessionManager = TrendingFeedSessionManager.getInstance();
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
  const [showTimeBottomSheet, setShowTimeBottomSheet] = useState(false);
  const [showNetworkBottomSheet, setShowNetworkBottomSheet] = useState(false);
  const [showPriceChangeBottomSheet, setShowPriceChangeBottomSheet] =
    useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  // Derive network name from selectedNetwork chain IDs
  const selectedNetworkName = useMemo(() => {
    if (!selectedNetwork || selectedNetwork.length === 0) {
      return strings('trending.all_networks');
    }
    const selectedNetworkChainId = selectedNetwork[0];

    // First check if network is in user's configurations
    const networkConfig = networkConfigurations[selectedNetworkChainId];
    if (networkConfig?.name) {
      return networkConfig.name;
    }

    // If not found, check PopularList
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
      // If parsing fails, fall through to default
    }

    return strings('trending.all_networks');
  }, [selectedNetwork, networkConfigurations]);

  // Use tokens section data as the single source of truth:
  // - When no search query: returns trending results from useTrendingRequest
  // - When search query exists: returns merged trending + search results
  const {
    data: searchResults,
    isLoading,
    refetch: refetchTokensSection,
  } = useTrendingSearch({
    searchQuery: searchQuery || undefined,
    sortBy,
    chainIds: selectedNetwork,
  });

  // Sort and display tokens based on selected option and direction
  const trendingTokens = useMemo(() => {
    // Early return if no results
    if (searchResults.length === 0) {
      return [];
    }

    // When searching, return results in relevance order (no sorting)
    if (searchQuery?.trim()) {
      return searchResults;
    }

    // When browsing (no search), apply sorting if option is selected
    if (!selectedPriceChangeOption) {
      return searchResults;
    }

    // Sort using the shared utility function
    const sorted = sortTrendingTokens(
      searchResults,
      selectedPriceChangeOption,
      priceChangeSortDirection,
      selectedTimeOption,
    );

    return sorted;
  }, [
    searchResults,
    searchQuery,
    selectedPriceChangeOption,
    priceChangeSortDirection,
    selectedTimeOption,
  ]);

  // Compute filter context for analytics tracking
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

  // Track search events with debounce
  const lastTrackedSearchQuery = useRef<string>('');
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    // Clear any existing debounce timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    const trimmedQuery = searchQuery?.trim() || '';

    // Only track if query is non-empty and different from last tracked
    if (trimmedQuery && trimmedQuery !== lastTrackedSearchQuery.current) {
      // Debounce search tracking by 500ms to avoid tracking every keystroke
      searchDebounceTimer.current = setTimeout(() => {
        const resultsCount = trendingTokens.length;
        sessionManager.trackSearch({
          search_query: trimmedQuery,
          results_count: resultsCount,
          has_results: resultsCount > 0,
          time_filter: selectedTimeOption,
          sort_option:
            selectedPriceChangeOption || PriceChangeOption.PriceChange,
          network_filter:
            selectedNetwork && selectedNetwork.length > 0
              ? selectedNetwork[0]
              : 'all',
        });
        lastTrackedSearchQuery.current = trimmedQuery;
      }, 500);
    }

    // Reset last tracked query when search is cleared
    if (!trimmedQuery) {
      lastTrackedSearchQuery.current = '';
    }

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [
    searchQuery,
    trendingTokens.length,
    selectedTimeOption,
    selectedPriceChangeOption,
    selectedNetwork,
    sessionManager,
  ]);

  const handlePriceChangeSelect = useCallback(
    (option: PriceChangeOption, sortDirection: SortDirection) => {
      const previousValue =
        selectedPriceChangeOption || PriceChangeOption.PriceChange;
      setSelectedPriceChangeOption(option);
      setPriceChangeSortDirection(sortDirection);

      // Track filter change if value actually changed
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

      // Track filter change if value actually changed
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

  const handleTimeSelect = useCallback(
    (selectedSortBy: SortTrendingBy, timeOption: TimeOption) => {
      const previousValue = selectedTimeOption;
      setSortBy(selectedSortBy);
      setSelectedTimeOption(timeOption);

      // Track filter change if value actually changed
      if (timeOption !== previousValue) {
        sessionManager.trackFilterChange({
          filter_type: 'time',
          previous_value: previousValue,
          new_value: timeOption,
          time_filter: timeOption,
          sort_option:
            selectedPriceChangeOption || PriceChangeOption.PriceChange,
          network_filter:
            selectedNetwork && selectedNetwork.length > 0
              ? selectedNetwork[0]
              : 'all',
        });
      }
    },
    [
      selectedTimeOption,
      selectedPriceChangeOption,
      selectedNetwork,
      sessionManager,
    ],
  );

  const handle24hPress = useCallback(() => {
    setShowTimeBottomSheet(true);
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      refetchTokensSection?.();
    } catch (error) {
      console.warn('Failed to refresh trending tokens:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchTokensSection]);

  // Get the button text based on selected price change option
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

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={
        Platform.OS === 'ios' ? ['left', 'right'] : ['left', 'right', 'bottom']
      }
    >
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <TrendingListHeader
          title={strings('trending.trending_tokens')}
          isSearchVisible={isSearchVisible}
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          onBack={handleBackPress}
          onSearchToggle={handleSearchToggle}
          testID="trending-tokens-header"
        />
      </View>
      {!isSearchVisible ? (
        <View style={styles.controlBarWrapper}>
          <View style={styles.controlButtonOuterWrapper}>
            <TouchableOpacity
              testID="price-change-button"
              onPress={handlePriceChangePress}
              style={[
                styles.controlButton,
                searchResults.length === 0 && styles.controlButtonDisabled,
              ]}
              activeOpacity={0.2}
              disabled={searchResults.length === 0}
            >
              <View style={styles.controlButtonContent}>
                <Text style={styles.controlButtonText}>
                  {priceChangeButtonText}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  color={IconColor.Alternative}
                  size={IconSize.Xs}
                />
              </View>
            </TouchableOpacity>
            <View style={styles.controlButtonInnerWrapper}>
              <TouchableOpacity
                testID="all-networks-button"
                onPress={handleAllNetworksPress}
                style={styles.controlButtonRight}
                activeOpacity={0.2}
              >
                <View style={styles.controlButtonContent}>
                  <Text
                    style={styles.controlButtonText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {selectedNetworkName}
                  </Text>
                  <Icon
                    name={IconName.ArrowDown}
                    color={IconColor.Alternative}
                    size={IconSize.Xs}
                  />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                testID="24h-button"
                onPress={handle24hPress}
                style={[
                  styles.controlButtonRightFixed,
                  searchQuery?.trim() && styles.controlButtonDisabled,
                ]}
                activeOpacity={0.2}
                disabled={!!searchQuery?.trim()}
              >
                <View style={styles.controlButtonContent}>
                  <Text style={styles.controlButtonText}>
                    {selectedTimeOption}
                  </Text>
                  <Icon
                    name={IconName.ArrowDown}
                    color={IconColor.Alternative}
                    size={IconSize.Xs}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.listContainer}>
          {Array.from({ length: 12 }).map((_, index) => (
            <TrendingTokensSkeleton key={index} />
          ))}
        </View>
      ) : (searchResults as TrendingAsset[]).length === 0 ? (
        searchQuery.trim().length > 0 ? (
          <EmptySearchResultState />
        ) : (
          <EmptyErrorTrendingState onRetry={handleRefresh} />
        )
      ) : (
        <View style={styles.listContainer}>
          <TrendingTokensList
            trendingTokens={trendingTokens}
            selectedTimeOption={selectedTimeOption}
            filterContext={filterContext}
            refreshControl={
              <RefreshControl
                colors={[theme.colors.primary.default]}
                tintColor={theme.colors.icon.default}
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          />
        </View>
      )}
      <TrendingTokenTimeBottomSheet
        isVisible={showTimeBottomSheet}
        onClose={() => setShowTimeBottomSheet(false)}
        onTimeSelect={handleTimeSelect}
        selectedTime={selectedTimeOption}
      />
      <TrendingTokenNetworkBottomSheet
        isVisible={showNetworkBottomSheet}
        onClose={() => setShowNetworkBottomSheet(false)}
        onNetworkSelect={handleNetworkSelect}
        selectedNetwork={selectedNetwork}
      />
      <TrendingTokenPriceChangeBottomSheet
        isVisible={showPriceChangeBottomSheet}
        onClose={() => setShowPriceChangeBottomSheet(false)}
        onPriceChangeSelect={handlePriceChangeSelect}
        selectedOption={selectedPriceChangeOption}
        sortDirection={priceChangeSortDirection}
      />
    </SafeAreaView>
  );
};

TrendingTokensFullView.displayName = 'TrendingTokensFullView';

export default TrendingTokensFullView;
