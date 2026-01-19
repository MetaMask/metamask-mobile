import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { getBridgeTokenSelectorNavbar } from '../../../Navbar';
import { FlatList } from 'react-native-gesture-handler';
import { NetworkPills } from './NetworkPills';
import { CaipAssetType, CaipChainId } from '@metamask/utils';
import { useStyles } from '../../../../../component-library/hooks';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import {
  selectEnabledChainRanking,
  setIsSelectingToken,
} from '../../../../../core/redux/slices/bridge';
import {
  formatAddressToAssetId,
  formatChainIdToCaip,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useAssetFromTheme } from '../../../../../util/theme';
import NoSearchResultsLight from '../../../../../images/predictions-no-search-results-light.svg';
import NoSearchResultsDark from '../../../../../images/predictions-no-search-results-dark.svg';
import { SkeletonItem } from '../BridgeTokenSelectorBase';
import { TokenSelectorItem } from '../TokenSelectorItem';
import { getNetworkImageSource } from '../../../../../util/networks';
import { BridgeToken } from '../../types';
import { usePopularTokens, IncludeAsset } from '../../hooks/usePopularTokens';
import { useSearchTokens } from '../../hooks/useSearchTokens';
import { useBalancesByAssetId } from '../../hooks/useBalancesByAssetId';
import { useTokensWithBalances } from '../../hooks/useTokensWithBalances';
import { useTokenSelection } from '../../hooks/useTokenSelection';
import { createStyles } from './BridgeTokenSelector.styles';
import Engine from '../../../../../core/Engine';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';

export interface BridgeTokenSelectorRouteParams {
  type: 'source' | 'dest';
}

const MIN_SEARCH_LENGTH = 3;
const ESTIMATED_ITEM_HEIGHT = 72;
const LOAD_MORE_DISTANCE_THRESHOLD = 300; // Distance from bottom to trigger load

export const BridgeTokenSelector: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route =
    useRoute<RouteProp<{ params: BridgeTokenSelectorRouteParams }, 'params'>>();
  const { styles } = useStyles(createStyles, {});
  const [searchString, setSearchString] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);
  const [flatListHeight, setFlatListHeight] = useState<number>(0);

  // Set selecting token state to prevent quote expired modal from showing
  useEffect(() => {
    dispatch(setIsSelectingToken(true));

    return () => {
      dispatch(setIsSelectingToken(false));
    };
  }, [dispatch]);

  // Get themed SVG for empty state
  const NoSearchResultsIcon = useAssetFromTheme(
    NoSearchResultsLight,
    NoSearchResultsDark,
  );

  // Check if search string meets minimum length requirement
  const isValidSearch = useMemo(
    () => searchString.trim().length >= MIN_SEARCH_LENGTH,
    [searchString],
  );

  const enabledChainRanking = useSelector(selectEnabledChainRanking);

  // Set navigation options for header
  useEffect(() => {
    navigation.setOptions(getBridgeTokenSelectorNavbar(navigation));
  }, [navigation]);

  // Use custom hook for token selection
  const { handleTokenPress, selectedToken } = useTokenSelection(
    route.params.type,
  );

  // Initialize selectedChainId with the chain id of the selected token
  const [selectedChainId, setSelectedChainId] = useState(
    selectedToken?.chainId && route.params?.type === 'dest'
      ? formatChainIdToCaip(selectedToken.chainId)
      : undefined,
  );

  // Ref to track if we need to re-search after chain change
  const shouldResearchAfterChainChange = useRef(false);

  // Track the last chain ID to detect changes
  const lastChainIdRef = useRef(selectedChainId);
  const [listKey, setListKey] = useState(0);

  // Update list key when network actually changes
  useEffect(() => {
    if (lastChainIdRef.current !== selectedChainId) {
      lastChainIdRef.current = selectedChainId;
      setListKey((prev) => prev + 1);
    }
  }, [selectedChainId]);

  const chainIdsToFetch = useMemo(() => {
    if (!enabledChainRanking || enabledChainRanking.length === 0) {
      return [];
    }

    // If a specific chain is selected, use only that chain
    if (selectedChainId) {
      return [selectedChainId];
    }

    // If "All" is selected, use all chains from filtered chainRanking
    return enabledChainRanking.map(
      (chain: { chainId: CaipChainId }) => chain.chainId,
    );
  }, [selectedChainId, enabledChainRanking]);

  // Get balances indexed by assetId for O(1) lookup when merging with API results
  const { tokensWithBalance, balancesByAssetId } = useBalancesByAssetId({
    chainIds: chainIdsToFetch,
  });
  const filteredTokensWithBalance = useMemo(() => {
    const filteredTokens = tokensWithBalance.filter(
      (token) => token.balance && parseFloat(token.balance) > 0,
    );

    if (!searchString.trim()) {
      return filteredTokens;
    }

    const searchLower = searchString.toLowerCase();
    return filteredTokens.filter(
      (token) =>
        token.name?.toLowerCase().includes(searchLower) ||
        token.symbol.toLowerCase().includes(searchLower) ||
        token.address.toLowerCase().includes(searchLower),
    );
  }, [tokensWithBalance, searchString]);

  // Create includeAssets array from tokens with balance to be sent to API
  // Stringified to avoid triggering the useEffect when only balances change
  const includeAssets = useMemo(() => {
    const assets = filteredTokensWithBalance.reduce<IncludeAsset[]>(
      (acc, token) => {
        const assetId = formatAddressToAssetId(token.address, token.chainId);
        if (assetId) {
          const normalizedAssetId = isNonEvmChainId(token.chainId)
            ? assetId
            : (assetId?.toLowerCase() as CaipAssetType);
          acc.push({
            assetId: normalizedAssetId,
            name: token.name ?? '',
            symbol: token.symbol,
            decimals: token.decimals,
          });
        }
        return acc;
      },
      [],
    );
    return JSON.stringify(assets);
  }, [filteredTokensWithBalance]);

  // Fetch popular tokens
  const { popularTokens, isLoading: isPopularTokensLoading } = usePopularTokens(
    {
      chainIds: chainIdsToFetch,
      includeAssets,
    },
  );

  // Search tokens
  const {
    searchResults,
    isSearchLoading,
    isLoadingMore,
    searchCursor,
    currentSearchQuery,
    searchTokens,
    debouncedSearch,
    resetSearch,
  } = useSearchTokens({
    chainIds: chainIdsToFetch,
    includeAssets,
  });

  // Use custom hook for merging balances
  const popularTokensWithBalance = useTokensWithBalances(
    popularTokens,
    balancesByAssetId,
  );
  const searchResultsWithBalance = useTokensWithBalances(
    searchResults,
    balancesByAssetId,
  );

  const displayData = useMemo(() => {
    const isLoading = isPopularTokensLoading || isSearchLoading;

    if (isValidSearch) {
      // Debounce creates a gap between user typing and search API call.
      // During this gap, returning an empty array collapses the FlatList layout,
      // which never recovers when results arrive. Skeletons maintain the layout.
      const isWaitingForDebounce =
        !isSearchLoading && currentSearchQuery !== searchString.trim();

      if (isLoading || isWaitingForDebounce) {
        // Show skeleton items while loading
        return Array(8).fill(null);
      }

      return searchResultsWithBalance;
    }

    if (isLoading) {
      // Show skeleton items while loading
      return Array(8).fill(null);
    }
    return popularTokensWithBalance;
  }, [
    isPopularTokensLoading,
    isSearchLoading,
    isValidSearch,
    searchResultsWithBalance,
    popularTokensWithBalance,
    currentSearchQuery,
    searchString,
  ]);

  // Re-trigger search when chain IDs change if there's an active search
  useEffect(() => {
    if (shouldResearchAfterChainChange.current && isValidSearch) {
      // Reset the flag
      shouldResearchAfterChainChange.current = false;
      // Trigger search with current query on new network
      searchTokens(searchString);
    }
  }, [chainIdsToFetch, searchString, searchTokens, isValidSearch]);

  // Auto-load second page if initial search results don't fill the view
  useEffect(() => {
    if (
      isValidSearch &&
      searchResults.length > 0 &&
      !isSearchLoading &&
      !isLoadingMore &&
      searchCursor &&
      flatListHeight > 0
    ) {
      const estimatedContentHeight =
        searchResults.length * ESTIMATED_ITEM_HEIGHT;

      // If estimated content doesn't fill the view, load more
      if (estimatedContentHeight < flatListHeight) {
        searchTokens(searchString, searchCursor);
      }
    }
  }, [
    isValidSearch,
    searchResults.length,
    isSearchLoading,
    isLoadingMore,
    searchCursor,
    flatListHeight,
    searchTokens,
    searchString,
  ]);

  const handleChainSelect = (chainId?: CaipChainId) => {
    // Do nothing if selecting the same network that's already selected
    if (chainId === selectedChainId) {
      return;
    }

    setSelectedChainId(chainId);

    // Cancel any pending debounced searches
    debouncedSearch.cancel();
    // Always reset search results to clear old network's data and ensure clean state
    resetSearch();

    // If there's an active search, prepare to re-trigger it on the new network
    if (isValidSearch) {
      // Set flag to trigger search after chain IDs update
      shouldResearchAfterChainChange.current = true;
    }
  };

  const handleSearchTextChange = (text: string) => {
    setSearchString(text);
    debouncedSearch(text);
  };

  const handleClearSearch = useCallback(() => {
    setSearchString('');
    debouncedSearch.cancel();
    resetSearch();
  }, [debouncedSearch, resetSearch]);

  const handleInfoButtonPress = useCallback(
    (item: BridgeToken) => {
      // Get network name from chainRanking feature flag data
      const chainData = enabledChainRanking.find(
        (chain: { chainId: CaipChainId; name: string }) =>
          chain.chainId === formatChainIdToCaip(item.chainId),
      );
      const networkName = chainData?.name ?? '';

      navigation.navigate('Asset', { ...item });

      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        UnifiedSwapBridgeEventName.AssetDetailTooltipClicked,
        {
          token_name: item.name ?? 'Unknown',
          token_symbol: item.symbol,
          token_contract: item.address,
          chain_name: networkName,
          chain_id: item.chainId,
        },
      );
    },
    [navigation, enabledChainRanking],
  );

  const renderToken = useCallback(
    ({ item }: ListRenderItemInfo<BridgeToken | null>) => {
      // This is to support a partial loading state for top tokens
      // We can show tokens with balance immediately, but we need to wait for the top tokens to load
      if (!item) {
        return <SkeletonItem />;
      }

      const isNoFeeAsset =
        route.params?.type === 'source'
          ? item.noFee?.isSource
          : item.noFee?.isDestination;
      return (
        <TokenSelectorItem
          token={item}
          isSelected={
            selectedToken &&
            selectedToken.address === item.address &&
            selectedToken.chainId === item.chainId
          }
          onPress={handleTokenPress}
          networkImageSource={getNetworkImageSource({
            chainId: item.chainId,
          })}
          isNoFeeAsset={isNoFeeAsset}
        >
          <ButtonIcon
            iconName={IconName.Info}
            size={ButtonIconSize.Md}
            onPress={() => handleInfoButtonPress(item)}
            iconProps={{ color: IconColor.IconAlternative }}
          />
        </TokenSelectorItem>
      );
    },
    [
      selectedToken,
      handleTokenPress,
      route.params?.type,
      handleInfoButtonPress,
    ],
  );

  const keyExtractor = useCallback(
    (item: BridgeToken | null, index: number) =>
      item ? `${item.chainId}-${item.address}` : `skeleton-${index}`,
    [],
  );

  // Load more results when user scrolls to the bottom
  const handleLoadMore = useCallback(() => {
    if (isValidSearch && !isSearchLoading && !isLoadingMore && searchCursor) {
      searchTokens(searchString, searchCursor);
    }
  }, [
    isValidSearch,
    isSearchLoading,
    isLoadingMore,
    searchCursor,
    searchTokens,
    searchString,
  ]);

  // Custom scroll handler for pagination (replaces buggy onEndReached)
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - LOAD_MORE_DISTANCE_THRESHOLD;

      if (isCloseToBottom) {
        handleLoadMore();
      }
    },
    [handleLoadMore],
  );

  // Render footer for pagination loading indicator
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) {
      return null;
    }
    return <SkeletonItem />;
  }, [isLoadingMore]);

  // Capture FlatList height for auto-load logic
  const handleFlatListLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      setFlatListHeight(event.nativeEvent.layout.height);
    },
    [],
  );

  // Render empty state when no tokens found
  const renderEmptyState = useCallback(() => {
    // Only show empty state when search is active and not loading
    if (!isValidSearch || isSearchLoading) {
      return null;
    }

    return (
      <Box
        testID="bridge-token-selector-empty-state"
        style={styles.emptyStateContainer}
      >
        <NoSearchResultsIcon width={72} height={78} />
        <Text
          variant={TextVariant.HeadingMd}
          color={TextColor.TextDefault}
          style={styles.emptyStateTitle}
        >
          {strings('bridge.no_tokens_found')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          style={styles.emptyStateDescription}
        >
          {strings('bridge.no_tokens_found_description')}
        </Text>
      </Box>
    );
  }, [
    isValidSearch,
    isSearchLoading,
    styles.emptyStateContainer,
    styles.emptyStateTitle,
    styles.emptyStateDescription,
    NoSearchResultsIcon,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Box style={styles.buttonContainer}>
        <NetworkPills
          selectedChainId={selectedChainId}
          onChainSelect={handleChainSelect}
        />

        <TextFieldSearch
          value={searchString}
          onChangeText={handleSearchTextChange}
          placeholder={strings('swaps.search_token')}
          testID="bridge-token-search-input"
          style={styles.searchInput}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          showClearButton={searchString.length > 0}
          onPressClearButton={handleClearSearch}
        />
      </Box>

      <FlatList
        ref={flatListRef}
        key={listKey}
        testID="bridge-token-list"
        style={styles.tokensList}
        contentContainerStyle={styles.tokensListContainer}
        data={displayData}
        renderItem={renderToken}
        keyExtractor={keyExtractor}
        extraData={displayData.length}
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        onLayout={handleFlatListLayout}
      />
    </SafeAreaView>
  );
};
