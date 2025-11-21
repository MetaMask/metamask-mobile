import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { getBridgeTokenSelectorNavbar } from '../../../Navbar';
import { FlatList } from 'react-native-gesture-handler';
import { NetworkPills } from './NetworkPills';
import { CaipChainId, parseCaipAssetType } from '@metamask/utils';
import { useStyles } from '../../../../../component-library/hooks';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import { constants } from 'ethers';
import {
  selectBridgeFeatureFlags,
  selectSourceToken,
  selectDestToken,
  setSourceToken,
  setDestToken,
} from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import {
  formatAddressToAssetId,
  formatChainIdToCaip,
  UnifiedSwapBridgeEventName,
  isNonEvmChainId,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { SkeletonItem } from '../BridgeTokenSelectorBase';
import { TokenSelectorItem } from '../TokenSelectorItem';
import { getNetworkImageSource } from '../../../../../util/networks';
import { BridgeToken } from '../../types';
import {
  usePopularTokens,
  PopularToken,
  IncludeAsset,
} from '../../hooks/usePopularTokens';
import { useSearchTokens } from '../../hooks/useSearchTokens';
import { useBalancesByAssetId } from '../../hooks/useBalancesByAssetId';
import { createStyles } from './BridgeTokenSelector.styles';
import Engine from '../../../../../core/Engine';
import { getNetworkName } from '../BridgeDestTokenSelector';
import { Hex } from 'viem';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';

export interface BridgeTokenSelectorRouteParams {
  type: 'source' | 'dest';
}

const MIN_SEARCH_LENGTH = 3;

const convertAPITokensToBridgeTokens = (
  apiTokens: PopularToken[],
): (BridgeToken & { assetId?: string })[] =>
  apiTokens.map((token) => {
    const { assetReference, chainId, assetNamespace } = parseCaipAssetType(
      token.assetId,
    );
    const isNonEvm = isNonEvmChainId(chainId);
    const isNative = assetNamespace === 'slip44';

    // For non-EVM chains, keep the full assetId as the address to properly match balances
    // For EVM native tokens, use the zero address (required by useLatestBalance)
    // For EVM ERC20 tokens, use the asset reference (the actual contract address)
    let address: string;
    if (isNonEvm) {
      address = token.assetId;
    } else if (isNative) {
      address = constants.AddressZero;
    } else {
      address = assetReference;
    }

    // For EVM chains, convert chainId to Hex format for useLatestBalance to work correctly
    // For non-EVM chains, keep CAIP format
    const formattedChainId = isNonEvm ? chainId : formatChainIdToHex(chainId);

    return {
      ...token,
      assetId: token.assetId,
      address,
      chainId: formattedChainId,
    };
  });

export const BridgeTokenSelector: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route =
    useRoute<RouteProp<{ params: BridgeTokenSelectorRouteParams }, 'params'>>();
  const { styles } = useStyles(createStyles, {});
  const [searchString, setSearchString] = useState<string>('');
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const flatListRef = useRef<FlatList>(null);
  const [flatListHeight, setFlatListHeight] = useState<number>(0);

  // Check if search string meets minimum length requirement
  const isValidSearch = useMemo(
    () => searchString.trim().length >= MIN_SEARCH_LENGTH,
    [searchString],
  );

  const bridgeFeatureFlags = useSelector((state: RootState) =>
    selectBridgeFeatureFlags(state),
  );

  // Set navigation options for header
  useEffect(() => {
    navigation.setOptions(getBridgeTokenSelectorNavbar(navigation));
  }, [navigation]);

  // Initialize selectedChainId with the chain id of the selected token
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const selectedToken =
    route.params?.type === 'source' ? sourceToken : destToken;
  const [selectedChainId, setSelectedChainId] = useState<
    CaipChainId | undefined
  >(
    selectedToken?.chainId && route.params?.type === 'dest'
      ? formatChainIdToCaip(selectedToken.chainId)
      : undefined,
  );

  // Ref to track if we need to re-search after chain change
  const shouldResearchAfterChainChange = useRef(false);

  // Chain IDs to fetch tokens for
  const chainIdsToFetch = useMemo(() => {
    if (!bridgeFeatureFlags.chainRanking) {
      return [];
    }

    // If a specific chain is selected, use only that chain
    if (selectedChainId) {
      return [selectedChainId];
    }

    // If "All" is selected, use all chains from chainRanking
    return bridgeFeatureFlags.chainRanking.map((chain) => chain.chainId);
  }, [selectedChainId, bridgeFeatureFlags]);

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
    const assets: IncludeAsset[] = filteredTokensWithBalance.reduce<
      IncludeAsset[]
    >((acc, token) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);
      if (assetId) {
        acc.push({
          assetId,
          name: token.name ?? '',
          symbol: token.symbol,
          decimals: token.decimals,
        });
      }
      return acc;
    }, []);
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
    searchTokens,
    debouncedSearch,
    resetSearch,
  } = useSearchTokens({
    chainIds: chainIdsToFetch,
    includeAssets,
  });

  const displayData = useMemo(() => {
    const isLoading = isPopularTokensLoading || isSearchLoading;
    if (isLoading) {
      // Show 8 skeleton items while loading
      return Array(8).fill(null);
    }

    let tokensToDisplay: BridgeToken[] = [];
    // Only show search results when query meets minimum length requirement
    if (isValidSearch) {
      // If we have a search query, show search results merged with balances
      const convertedSearchResults =
        convertAPITokensToBridgeTokens(searchResults);
      // Merge balances from the selector into search results
      const searchResultsWithBalance = convertedSearchResults.map((token) => {
        const balanceData = balancesByAssetId[token.assetId ?? ''];
        if (balanceData) {
          return {
            ...token,
            balance: balanceData.balance,
            balanceFiat: balanceData.balanceFiat,
            tokenFiatAmount: balanceData.tokenFiatAmount,
            currencyExchangeRate: balanceData.currencyExchangeRate,
          };
        }
        return token;
      });
      tokensToDisplay = searchResultsWithBalance;
    } else {
      // Default: show popular tokens merged with balances
      const convertedPopularTokens =
        convertAPITokensToBridgeTokens(popularTokens);
      // Merge balances from the selector into popular tokens
      const popularTokensWithBalance = convertedPopularTokens.map((token) => {
        const balanceData = balancesByAssetId[token.assetId ?? ''];
        if (balanceData) {
          return {
            ...token,
            balance: balanceData.balance,
            balanceFiat: balanceData.balanceFiat,
            tokenFiatAmount: balanceData.tokenFiatAmount,
            currencyExchangeRate: balanceData.currencyExchangeRate,
          };
        }
        return token;
      });
      tokensToDisplay = popularTokensWithBalance;
    }

    return tokensToDisplay;
  }, [
    isPopularTokensLoading,
    isSearchLoading,
    isValidSearch,
    searchResults,
    popularTokens,
    balancesByAssetId,
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
      // Estimate item height (approximate height of TokenSelectorItem)
      const ESTIMATED_ITEM_HEIGHT = 72;
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
    setSelectedChainId(chainId);

    // If there's an active search, prepare to re-trigger it on the new network
    if (isValidSearch) {
      // Cancel any pending debounced searches
      debouncedSearch.cancel();
      // Reset search results to clear old network's data
      resetSearch();
      // Set flag to trigger search after chain IDs update
      shouldResearchAfterChainChange.current = true;
    }
  };

  const handleSearchTextChange = (text: string) => {
    setSearchString(text);
    debouncedSearch(text);
  };

  const handleTokenPress = useCallback(
    (token: BridgeToken) => {
      const isSourcePicker = route.params?.type === 'source';
      const otherToken = isSourcePicker ? destToken : sourceToken;

      // Check if the selected token matches the "other" token (dest when selecting source, source when selecting dest)
      const isSelectingOtherToken =
        otherToken &&
        token.address === otherToken.address &&
        token.chainId === otherToken.chainId;

      if (isSelectingOtherToken && sourceToken && destToken) {
        // Swap the tokens: old source becomes dest, old dest becomes source
        dispatch(setSourceToken(destToken));
        dispatch(setDestToken(sourceToken));
      } else {
        // Normal selection: just update the current token
        dispatch(isSourcePicker ? setSourceToken(token) : setDestToken(token));
      }

      navigation.goBack();
    },
    [navigation, dispatch, route.params?.type, sourceToken, destToken],
  );

  const handleInfoButtonPress = useCallback(
    (item: BridgeToken) => {
      navigation.dispatch({
        type: 'NAVIGATE',
        payload: {
          name: 'Asset',
          key: `Asset-${item.address}-${item.chainId}-${Date.now()}`,
          params: { ...item },
        },
      });

      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        UnifiedSwapBridgeEventName.AssetDetailTooltipClicked,
        {
          token_name: item.name ?? 'Unknown',
          token_symbol: item.symbol,
          token_contract: item.address,
          chain_name: getNetworkName(
            item.chainId as Hex,
            networkConfigurations,
          ),
          chain_id: item.chainId,
        },
      );
    },
    [navigation, networkConfigurations],
  );

  const renderToken = useCallback(
    ({ item }: { item: BridgeToken | null }) => {
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
    // Only load more if:
    // 1. We have a valid search query (meets minimum length)
    // 2. We're not currently loading
    // 3. We have a cursor for pagination
    // 4. We have already searched once
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
      const paddingToBottom = 300; // Distance from bottom to trigger load
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;

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
        />
      </Box>

      <FlatList
        ref={flatListRef}
        key={selectedChainId || 'all'}
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
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={20}
        onLayout={handleFlatListLayout}
      />
    </SafeAreaView>
  );
};
