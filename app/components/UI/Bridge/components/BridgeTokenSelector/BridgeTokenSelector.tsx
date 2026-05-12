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
import {
  useNavigation,
  useRoute,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { FlatList } from 'react-native-gesture-handler';
import { NetworkPills } from './NetworkPills';
import Routes from '../../../../../constants/navigation/Routes';
import { CaipChainId } from '@metamask/utils';
import { useStyles } from '../../../../../component-library/hooks';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import {
  selectAllowedChainRanking,
  selectTokenSelectorNetworkFilter,
  setIsSelectingToken,
  setTokenSelectorNetworkFilter,
} from '../../../../../core/redux/slices/bridge';
import {
  formatChainIdToCaip,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  HeaderStandard,
  IconColor,
  IconName,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useAssetFromTheme } from '../../../../../util/theme';
import NoSearchResultsLight from '../../../../../images/predictions-no-search-results-light.svg';
import NoSearchResultsDark from '../../../../../images/predictions-no-search-results-dark.svg';
import { SkeletonItem } from '../SkeletonItem';
import { TabEmptyState } from '../../../../../component-library/components-temp/TabEmptyState';
import { TokenSelectorItem } from '../TokenSelectorItem';
import { getNetworkImageSource } from '../../../../../util/networks';
import { type BridgeToken, TokenSelectorType } from '../../types';
import { usePopularTokens } from '../../hooks/usePopularTokens';
import { useSearchTokens } from '../../hooks/useSearchTokens';
import { useTokensWithBalances } from '../../hooks/useTokensWithBalances';
import { useTokenSelection } from '../../hooks/useTokenSelection';
import { createStyles } from './BridgeTokenSelector.styles';
import Engine from '../../../../../core/Engine';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import { useInitialBridgeTokens } from '../../hooks/useInitialBridgeTokens';

export interface BridgeTokenSelectorRouteParams {
  type: TokenSelectorType;
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

  const enabledChainRanking = useSelector(selectAllowedChainRanking);

  // Use custom hook for token selection
  const { handleTokenPress, selectedToken } = useTokenSelection(
    route.params?.type,
  );

  // Compute the initial network filter synchronously so the first render
  // has the correct value — avoids a wasted all-chains fetch and FlatList
  // remount that would occur if we relied solely on the async useEffect.
  const initialFilter = useMemo(
    () =>
      selectedToken?.chainId && route.params?.type === TokenSelectorType.Dest
        ? formatChainIdToCaip(selectedToken.chainId)
        : undefined,
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Track whether we've synced the initial filter into Redux.
  // Before sync, we use initialFilter directly; after sync, we trust Redux
  // (which may be undefined when the user selects "All").
  const hasSyncedFilter = useRef(false);
  const reduxFilter = useSelector(selectTokenSelectorNetworkFilter);
  const selectedChainId = hasSyncedFilter.current
    ? reduxFilter
    : (reduxFilter ?? initialFilter);

  // Sync the initial filter into Redux on mount so other consumers
  // (e.g. NetworkListModal) see the correct value. Clear on unmount.
  useEffect(() => {
    if (initialFilter) {
      dispatch(setTokenSelectorNetworkFilter(initialFilter));
    }
    hasSyncedFilter.current = true;
    return () => {
      dispatch(setTokenSelectorNetworkFilter(undefined));
    };
  }, [dispatch, initialFilter]);

  // Ref to track if we need to re-search after chain change
  const shouldResearchAfterChainChange = useRef(false);

  // Track the last chain ID to detect changes
  const lastChainIdRef = useRef(selectedChainId);
  const [listKey, setListKey] = useState(0);

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

  const {
    includeAssets,
    fetchPopularTokens,
    balancesByAssetId,
    searchIncludeAssets,
  } = useInitialBridgeTokens(chainIdsToFetch, searchString);

  // Fetch popular tokens
  const { popularTokens, isLoading: isPopularTokensLoading } = usePopularTokens(
    {
      includeAssets,
      fetchTokens: fetchPopularTokens,
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
    includeAssets: searchIncludeAssets,
  });

  // React to network filter changes from any source (pill press or modal).
  // Cancels pending searches, resets stale results, and flags for re-search.
  useEffect(() => {
    if (lastChainIdRef.current !== selectedChainId) {
      lastChainIdRef.current = selectedChainId;
      setListKey((prev) => prev + 1);

      // Cancel any pending debounced searches
      debouncedSearch.cancel();
      // Clear old network's data to ensure clean state
      resetSearch();

      // If there's an active search, prepare to re-trigger it on the new network
      if (isValidSearch) {
        shouldResearchAfterChainChange.current = true;
      }
    }
  }, [selectedChainId, debouncedSearch, resetSearch, isValidSearch]);

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
        const skeletonItemsCount = 8 - searchResultsWithBalance.length;
        // Show skeleton items while loading
        return [
          ...searchResultsWithBalance,
          ...Array(Math.max(1, skeletonItemsCount)).fill(null),
        ];
      }
      return searchResultsWithBalance;
    }

    if (isLoading) {
      // Show skeleton items while loading
      const skeletonItemsCount = 8 - popularTokensWithBalance.length;
      return [
        ...popularTokensWithBalance,
        ...Array(Math.max(1, skeletonItemsCount)).fill(null),
      ];
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

  const handleChainSelect = useCallback(
    (chainId?: CaipChainId) => {
      // Do nothing if selecting the same network that's already selected
      if (chainId === selectedChainId) {
        return;
      }

      dispatch(setTokenSelectorNetworkFilter(chainId));

      // Eagerly clean up search state so the UI doesn't flash stale results.
      // The useEffect watching selectedChainId also performs this cleanup
      // to handle changes from NetworkListModal (which dispatches directly).
      debouncedSearch.cancel();
      resetSearch();

      if (isValidSearch) {
        shouldResearchAfterChainChange.current = true;
      }
    },
    [selectedChainId, dispatch, debouncedSearch, resetSearch, isValidSearch],
  );

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

      // Use push so we always open details for the tapped token.
      // navigate('Asset') can reuse an existing Asset route with stale params.
      navigation.dispatch(
        StackActions.push('Asset', {
          ...item,
          source: TokenDetailsSource.Swap,
        }),
      );

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
        route.params?.type === TokenSelectorType.Source
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
            size={ButtonIconSize.Sm}
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
      <TabEmptyState
        testID="bridge-token-selector-empty-state"
        icon={<NoSearchResultsIcon width={72} height={78} />}
        description={strings('bridge.no_tokens_found')}
        descriptionProps={{
          variant: TextVariant.HeadingMd,
          color: TextColor.TextDefault,
          twClassName: 'text-center',
        }}
        style={styles.emptyStateContainer}
        twClassName="self-center"
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center -mt-1"
        >
          {strings('bridge.no_tokens_found_description')}
        </Text>
      </TabEmptyState>
    );
  }, [
    isValidSearch,
    isSearchLoading,
    styles.emptyStateContainer,
    NoSearchResultsIcon,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <HeaderStandard
        title={strings('bridge.select_token')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <Box twClassName="px-4 pb-3">
        <TextFieldSearch
          value={searchString}
          onChangeText={handleSearchTextChange}
          placeholder={strings('swaps.search_token')}
          testID="bridge-token-search-input"
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          onPressClearButton={handleClearSearch}
        />
      </Box>
      <Box twClassName="pt-2 pb-4 pl-4">
        <NetworkPills
          selectedChainId={selectedChainId}
          onChainSelect={handleChainSelect}
          onMorePress={() =>
            navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
              screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
            })
          }
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
