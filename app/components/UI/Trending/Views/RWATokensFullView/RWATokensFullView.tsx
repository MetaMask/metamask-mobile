import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Platform, View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useAppThemeFromContext } from '../../../../../util/theme';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { TrendingListHeader } from '../../components/TrendingListHeader';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { CaipChainId, Hex, parseCaipChainId } from '@metamask/utils';
import { PopularList } from '../../../../../util/networks/customNetworks';
import Text from '../../../../../component-library/components/Texts/Text';
import {
  TrendingTokenNetworkBottomSheet,
  TrendingTokenPriceChangeBottomSheet,
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../components/TrendingTokensBottomSheet';
import { useRwaTokens } from '../../hooks/useRwaTokens/useRwaTokens';
import { TrendingTokensData } from '../TrendingTokensFullView/TrendingTokensFullView';
import type { TrendingFilterContext } from '../../components/TrendingTokensList/TrendingTokensList';
import TrendingFeedSessionManager from '../../services/TrendingFeedSessionManager';

interface RWATokensNavigationParamList {
  [key: string]: undefined | object;
}

const RWATokensFullView = () => {
  const navigation =
    useNavigation<StackNavigationProp<RWATokensNavigationParamList>>();
  const tw = useTailwind();
  const theme = useAppThemeFromContext();
  const insets = useSafeAreaInsets();
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
      // If parsing fails, fall through to default
    }

    return strings('trending.all_networks');
  }, [selectedNetwork, networkConfigurations]);

  const {
    data: searchResults,
    isLoading,
    refetch: refetchStocks,
  } = useRwaTokens({
    searchQuery: searchQuery || undefined,
    chainIds: selectedNetwork,
    sortTrendingTokensOptions: {
      option: selectedPriceChangeOption ?? PriceChangeOption.PriceChange,
      direction: priceChangeSortDirection,
    },
  });

  const trendingTokens = useMemo<TrendingAsset[]>(
    () => (searchResults.length === 0 ? [] : searchResults),
    [searchResults],
  );

  const filterContext: TrendingFilterContext = useMemo(
    () => ({
      timeFilter: TimeOption.TwentyFourHours,
      sortOption: selectedPriceChangeOption,
      networkFilter:
        selectedNetwork && selectedNetwork.length > 0
          ? selectedNetwork[0]
          : 'all',
      isSearchResult: Boolean(searchQuery?.trim()),
    }),
    [selectedPriceChangeOption, selectedNetwork, searchQuery],
  );

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
          time_filter: TimeOption.TwentyFourHours,
          sort_option: option,
          network_filter:
            selectedNetwork && selectedNetwork.length > 0
              ? selectedNetwork[0]
              : 'all',
        });
      }
    },
    [selectedPriceChangeOption, selectedNetwork, sessionManager],
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
          time_filter: TimeOption.TwentyFourHours,
          sort_option:
            selectedPriceChangeOption || PriceChangeOption.PriceChange,
          network_filter: newValue,
        });
      }
    },
    [selectedNetwork, selectedPriceChangeOption, sessionManager],
  );

  const handleAllNetworksPress = useCallback(() => {
    setShowNetworkBottomSheet(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      refetchStocks?.();
    } catch (error) {
      console.warn('Failed to refresh stocks:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchStocks]);

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
      style={tw`flex-1 bg-default`}
      edges={
        Platform.OS === 'ios' ? ['left', 'right'] : ['left', 'right', 'bottom']
      }
    >
      <View style={tw.style('bg-default', { paddingTop: insets.top })}>
        <TrendingListHeader
          title={strings('trending.stocks')}
          isSearchVisible={isSearchVisible}
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          onBack={handleBackPress}
          onSearchToggle={handleSearchToggle}
          testID="rwa-tokens-header"
        />
      </View>
      {!isSearchVisible ? (
        <View style={tw`flex-grow-0 p-4`}>
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity
              testID="price-change-button"
              onPress={handlePriceChangePress}
              style={tw.style(
                'py-2 px-3 items-center rounded-lg bg-muted',
                searchResults.length === 0 && 'opacity-50',
              )}
              activeOpacity={0.2}
              disabled={searchResults.length === 0}
            >
              <View style={tw`flex-row items-center justify-center gap-1`}>
                <Text
                  style={tw`min-w-0 shrink text-[14px] font-semibold text-default`}
                >
                  {priceChangeButtonText}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  color={IconColor.Alternative}
                  size={IconSize.Xs}
                />
              </View>
            </TouchableOpacity>
            <View style={tw`ml-2 min-w-0 shrink flex-row items-center gap-2`}>
              <TouchableOpacity
                testID="all-networks-button"
                onPress={handleAllNetworksPress}
                style={tw`min-w-0 shrink items-center rounded-lg bg-muted p-2`}
                activeOpacity={0.2}
              >
                <View style={tw`flex-row items-center justify-center gap-1`}>
                  <Text
                    style={tw`min-w-0 shrink text-[14px] font-semibold text-default`}
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
            </View>
          </View>
        </View>
      ) : null}

      <TrendingTokensData
        isLoading={isLoading}
        refreshing={refreshing}
        trendingTokens={trendingTokens}
        search={{ searchResults, searchQuery }}
        handleRefresh={handleRefresh}
        selectedTimeOption={TimeOption.TwentyFourHours}
        filterContext={filterContext}
        theme={theme}
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

RWATokensFullView.displayName = 'RWATokensFullView';

export default RWATokensFullView;
