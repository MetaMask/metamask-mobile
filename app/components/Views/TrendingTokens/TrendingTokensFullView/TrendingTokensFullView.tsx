import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
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
import TrendingTokensList from '../../../UI/Trending/components/TrendingTokensList/TrendingTokensList';
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

interface TrendingTokensNavigationParamList {
  [key: string]: undefined | object;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
      paddingBottom: 16,
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
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 16,
      justifyContent: 'space-between',
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    controlButtonInnerWrapper: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      flexShrink: 0,
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
    },
  });

const TrendingTokensFullView = () => {
  const navigation =
    useNavigation<StackNavigationProp<TrendingTokensNavigationParamList>>();
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
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
  } = useTrendingSearch(searchQuery || undefined, sortBy, selectedNetwork);

  // Sort and display tokens based on selected option and direction
  const trendingTokens = useMemo(() => {
    // Early return if no results
    if (searchResults.length === 0) {
      return [];
    }

    // If no sort option selected, return filtered results as-is (already sorted by API)
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
    selectedPriceChangeOption,
    priceChangeSortDirection,
    selectedTimeOption,
  ]);

  const handlePriceChangeSelect = useCallback(
    (option: PriceChangeOption, sortDirection: SortDirection) => {
      setSelectedPriceChangeOption(option);
      setPriceChangeSortDirection(sortDirection);
    },
    [],
  );

  const handlePriceChangePress = useCallback(() => {
    setShowPriceChangeBottomSheet(true);
  }, []);

  const handleNetworkSelect = useCallback((chainIds: CaipChainId[] | null) => {
    setSelectedNetwork(chainIds);
  }, []);

  const handleAllNetworksPress = useCallback(() => {
    setShowNetworkBottomSheet(true);
  }, []);

  const handleTimeSelect = useCallback(
    (selectedSortBy: SortTrendingBy, timeOption: TimeOption) => {
      setSortBy(selectedSortBy);
      setSelectedTimeOption(timeOption);
    },
    [],
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
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
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
              style={styles.controlButton}
              activeOpacity={0.2}
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
                  <Text style={styles.controlButtonText}>
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
                style={styles.controlButtonRight}
                activeOpacity={0.2}
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

      {isLoading || (searchResults as TrendingAsset[]).length === 0 ? (
        <View style={styles.listContainer}>
          {Array.from({ length: 12 }).map((_, index) => (
            <TrendingTokensSkeleton key={index} />
          ))}
        </View>
      ) : (
        <View style={styles.listContainer}>
          <TrendingTokensList
            trendingTokens={trendingTokens}
            selectedTimeOption={selectedTimeOption}
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
