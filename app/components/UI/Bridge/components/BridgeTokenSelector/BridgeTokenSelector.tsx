import React, { useState, useMemo, useCallback, useEffect } from 'react';
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

const convertAPITokensToBridgeTokens = (
  apiTokens: PopularToken[],
): (BridgeToken & { assetId?: string })[] =>
  apiTokens.map((token) => ({
    ...token,
    assetId: token.assetId,
    address: parseCaipAssetType(token.assetId).assetReference,
  }));

export const BridgeTokenSelector: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route =
    useRoute<RouteProp<{ params: BridgeTokenSelectorRouteParams }, 'params'>>();
  const { styles } = useStyles(createStyles, {});
  const [searchString, setSearchString] = useState<string>('');
  const networkConfigurations = useSelector(selectNetworkConfigurations);

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
    selectedToken?.chainId
      ? formatChainIdToCaip(selectedToken.chainId)
      : undefined,
  );

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
    if (searchString.trim()) {
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

    // Filter to avoid matching source and destination tokens
    const tokenToExclude =
      route.params?.type === 'source' ? destToken : sourceToken;
    const filteredTokensToDisplay = tokensToDisplay.filter(
      (token) =>
        !(
          token?.address === tokenToExclude?.address &&
          token?.chainId === tokenToExclude?.chainId
        ),
    );

    return filteredTokensToDisplay;
  }, [
    isPopularTokensLoading,
    isSearchLoading,
    searchString,
    searchResults,
    popularTokens,
    balancesByAssetId,
    route.params?.type,
    sourceToken,
    destToken,
  ]);

  const handleChainSelect = (chainId?: CaipChainId) => {
    setSelectedChainId(chainId);
    // Reset search when changing network
    setSearchString('');
    resetSearch();
  };

  const handleSearchTextChange = (text: string) => {
    setSearchString(text);
    debouncedSearch(text);
  };

  const handleTokenPress = useCallback(
    (token: BridgeToken) => {
      // TODO: Implement token selection - dispatch to Redux and navigate back
      dispatch(
        route.params?.type === 'source'
          ? setSourceToken(token)
          : setDestToken(token),
      );
      navigation.goBack();
    },
    [navigation, dispatch, route.params?.type],
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
            formatChainIdToCaip(selectedToken.chainId) === item.chainId
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
    // 1. We have a search query
    // 2. We're not currently loading
    // 3. We have a cursor for pagination
    // 4. We have already searched once
    if (
      searchString.trim() &&
      !isSearchLoading &&
      !isLoadingMore &&
      searchCursor
    ) {
      searchTokens(searchString, searchCursor);
    }
  }, [
    searchString,
    isSearchLoading,
    isLoadingMore,
    searchCursor,
    searchTokens,
  ]);

  // Render footer for pagination loading indicator
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) {
      return null;
    }
    return <SkeletonItem />;
  }, [isLoadingMore]);

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
        style={styles.tokensList}
        contentContainerStyle={styles.tokensListContainer}
        data={displayData}
        renderItem={renderToken}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    </SafeAreaView>
  );
};
