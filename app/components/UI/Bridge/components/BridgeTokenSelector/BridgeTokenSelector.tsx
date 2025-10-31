import React, { useRef, useState, useMemo, useCallback } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { FlatList } from 'react-native-gesture-handler';
import { NetworkPills } from './NetworkPills';
import { CaipChainId, parseCaipAssetType } from '@metamask/utils';
import { useStyles } from '../../../../../component-library/hooks';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import {
  selectBridgeFeatureFlags,
  selectSourceToken,
  selectDestToken,
} from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import {
  formatAddressToAssetId,
  formatChainIdToCaip,
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
import { useTokensWithBalance } from '../../hooks/useTokensWithBalance';
import { usePopularTokens, PopularToken } from '../../hooks/usePopularTokens';
import { useSearchTokens } from '../../hooks/useSearchTokens';
import { createStyles } from './BridgeTokenSelector.styles';

export interface BridgeTokenSelectorRouteParams {
  type: 'source' | 'dest';
}

const convertAPITokensToBridgeTokens = (
  apiTokens: PopularToken[],
): BridgeToken[] =>
  apiTokens.map((token) => ({
    ...token,
    address: parseCaipAssetType(token.assetId).assetReference,
  }));

export const BridgeTokenSelector: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: BridgeTokenSelectorRouteParams }, 'params'>>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(createStyles, {});
  const [searchString, setSearchString] = useState<string>('');

  const bridgeFeatureFlags = useSelector((state: RootState) =>
    selectBridgeFeatureFlags(state),
  );
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const selectedToken =
    route.params?.type === 'source' ? sourceToken : destToken;

  // Initialize selectedChainId with the initial chain id
  const [selectedChainId, setSelectedChainId] = useState<
    CaipChainId | undefined
  >(
    selectedToken?.chainId
      ? formatChainIdToCaip(selectedToken.chainId)
      : undefined,
  );

  // Chain IDs to display in the token selector
  const displayChainIds = useMemo(() => {
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

  const tokensWithBalance = useTokensWithBalance({ chainIds: displayChainIds });
  // List of assetIds for assets with balance to be excluded from the popular tokens query
  // Stringified to avoid triggering the useEffect when only balances change
  const assetsWithBalanceAssetIds = useMemo(() => {
    const assetIds = tokensWithBalance.map((token) =>
      formatAddressToAssetId(token.address, token.chainId),
    );
    return JSON.stringify(assetIds);
  }, [tokensWithBalance]);

  // Fetch popular tokens
  const { popularTokens, isLoading: isPopularTokensLoading } = usePopularTokens(
    {
      chainIds: displayChainIds,
      excludeAssetIds: assetsWithBalanceAssetIds,
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
    chainIds: displayChainIds,
    excludeAssetIds: assetsWithBalanceAssetIds,
  });

  // Filter local tokens with balance based on search query
  const filteredTokensWithBalance = useMemo(() => {
    if (!searchString.trim()) {
      return tokensWithBalance;
    }

    const searchLower = searchString.toLowerCase();
    return tokensWithBalance.filter(
      (token) =>
        token.name?.toLowerCase().includes(searchLower) ||
        token.symbol.toLowerCase().includes(searchLower) ||
        token.address.toLowerCase().includes(searchLower),
    );
  }, [tokensWithBalance, searchString]);

  const displayData = useMemo(() => {
    const isLoading = isPopularTokensLoading || isSearchLoading;
    if (isLoading) {
      // Show 8 skeleton items while loading
      return Array(8).fill(null);
    }

    // If we have a search query, show search results
    if (searchString.trim()) {
      const convertedSearchResults =
        convertAPITokensToBridgeTokens(searchResults);
      return [...filteredTokensWithBalance, ...convertedSearchResults];
    }

    // Default: show tokens with balance and popular tokens
    const convertedPopularTokens =
      convertAPITokensToBridgeTokens(popularTokens);
    return [...tokensWithBalance, ...convertedPopularTokens];
  }, [
    isPopularTokensLoading,
    isSearchLoading,
    searchString,
    filteredTokensWithBalance,
    searchResults,
    tokensWithBalance,
    popularTokens,
  ]);

  const handleClose = () => {
    navigation.goBack();
  };

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

  const handleTokenPress = useCallback(() => {
    // TODO: Implement token selection - dispatch to Redux and navigate back
    navigation.goBack();
  }, [navigation]);

  const renderToken = useCallback(
    ({ item }: { item: BridgeToken | null }) => {
      // This is to support a partial loading state for top tokens
      // We can show tokens with balance immediately, but we need to wait for the top tokens to load
      if (!item) {
        return <SkeletonItem />;
      }

      // Open the asset details screen as a bottom sheet
      // Use dispatch with unique key to force new modal instance
      const handleInfoButtonPress = () => {
        navigation.dispatch({
          type: 'NAVIGATE',
          payload: {
            name: 'Asset',
            key: `Asset-${item.address}-${item.chainId}-${Date.now()}`,
            params: { ...item },
          },
        });

        // TODO: update event props
        // Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        //   UnifiedSwapBridgeEventName.AssetDetailTooltipClicked,
        //   {
        //     token_name: item.name ?? 'Unknown',
        //     token_symbol: item.symbol,
        //     token_contract: itemAddress,
        //     chain_name: networkName,
        //     chain_id: item.chainId,
        //   },
        // );
      };

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
        >
          <ButtonIcon
            iconName={IconName.Info}
            size={ButtonIconSize.Md}
            onPress={handleInfoButtonPress}
            iconProps={{ color: IconColor.IconAlternative }}
          />
        </TokenSelectorItem>
      );
    },
    [navigation, selectedToken, handleTokenPress],
  );

  const keyExtractor = (item: BridgeToken | null, index: number) =>
    item ? `${item.chainId}-${item.address}` : `skeleton-${index}`;

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
    <BottomSheet
      ref={sheetRef}
      isFullscreen
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('bridge.select_token')}
        </Text>
      </BottomSheetHeader>

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

      <Box style={styles.tokensListContainer}>
        <FlatList
          style={styles.tokensList}
          data={displayData}
          renderItem={renderToken}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator
          showsHorizontalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      </Box>
    </BottomSheet>
  );
};
