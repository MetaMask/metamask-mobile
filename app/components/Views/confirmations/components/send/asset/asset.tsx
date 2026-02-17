import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import TextFieldSearch from '../../../../../../component-library/components/Form/TextFieldSearch';
import { useAssetSelectionMetrics } from '../../../hooks/send/metrics/useAssetSelectionMetrics';
import { useTokenSearch } from '../../../hooks/send/useTokenSearch';
import { TokenList } from '../../token-list';
import { NftList } from '../../nft-list';

import {
  AssetType,
  HighlightedActionListItem,
  HighlightedAssetListItem,
  isHighlightedActionListItem,
  isHighlightedAssetListItem,
  TokenListItem,
} from '../../../types/token';
import { NetworkFilter } from '../../network-filter';
import { useEVMNfts } from '../../../hooks/send/useNfts';
import { useSendTokens } from '../../../hooks/send/useSendTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';
import { HighlightedAction } from '../../UI/highlighted-action';

export interface AssetProps {
  hideNfts?: boolean;
  includeNoBalance?: boolean;
  onTokenSelect?: (token: AssetType) => void;
  tokenFilter?: (assets: AssetType[]) => TokenListItem[];
  hideNetworkFilter?: boolean;
}

export const Asset: React.FC<AssetProps> = (props = {}) => {
  const {
    hideNfts = false,
    includeNoBalance = false,
    onTokenSelect,
    tokenFilter,
    hideNetworkFilter = false,
  } = props;

  const originalTokens = useSendTokens({ includeNoBalance });

  const tokenItems = useMemo(
    () => (tokenFilter ? tokenFilter(originalTokens) : originalTokens),
    [originalTokens, tokenFilter],
  );

  const {
    tokens,
    highlightedAssets,
    highlightedActions,
  }: {
    tokens: AssetType[];
    highlightedAssets: HighlightedAssetListItem[];
    highlightedActions: HighlightedActionListItem[];
  } = useMemo(() => {
    const mappedTokens: AssetType[] = [];
    const mappedHighlightedAssets: HighlightedAssetListItem[] = [];
    const mappedHighlightedActions: HighlightedActionListItem[] = [];

    tokenItems.forEach((item) => {
      if (isHighlightedActionListItem(item)) {
        mappedHighlightedActions.push(item);
        return;
      }

      if (isHighlightedAssetListItem(item)) {
        mappedHighlightedAssets.push(item);
        return;
      }

      mappedTokens.push(item);
    });

    return {
      tokens: mappedTokens,
      highlightedAssets: mappedHighlightedAssets,
      highlightedActions: mappedHighlightedActions,
    };
  }, [tokenItems]);

  const nfts = useEVMNfts();
  const [filteredTokensByNetwork, setFilteredTokensByNetwork] =
    useState<AssetType[]>(tokens);
  const [selectedNetworkFilter, setSelectedNetworkFilter] =
    useState<string>('all');
  const { bottom: bottomOffset } = useSafeAreaInsets();

  const {
    searchQuery,
    setSearchQuery,
    filteredTokens,
    filteredNfts,
    clearSearch,
  } = useTokenSearch(filteredTokensByNetwork, nfts, selectedNetworkFilter);

  const {
    setAssetListSize,
    setNoneAssetFilterMethod,
    setSearchAssetFilterMethod,
  } = useAssetSelectionMetrics();

  const [hasActiveNetworkFilter, setHasActiveNetworkFilter] = useState(false);

  const [clearNetworkFilters, setClearNetworkFilters] = useState<
    (() => void) | null
  >(null);

  const handleFilteredTokensChange = useCallback(
    (newFilteredTokens: AssetType[]) => {
      setFilteredTokensByNetwork(newFilteredTokens);
    },
    [],
  );

  const handleNetworkFilterStateChange = useCallback(
    (hasActiveFilter: boolean) => {
      setHasActiveNetworkFilter(hasActiveFilter);
    },
    [],
  );

  const handleNetworkFilterChange = useCallback((networkFilter: string) => {
    setSelectedNetworkFilter(networkFilter);
  }, []);

  const handleExposeFilterControls = useCallback((clearFilters: () => void) => {
    setClearNetworkFilters(() => clearFilters);
  }, []);

  const hasActiveFilters = searchQuery.length > 0 || hasActiveNetworkFilter;
  const hasNoTokenResults =
    filteredTokens.length === 0 &&
    highlightedAssets.length === 0 &&
    highlightedActions.length === 0;
  const hasNoResults = hasNoTokenResults && filteredNfts.length === 0;

  const handleClearAllFilters = useCallback(() => {
    clearSearch();
    clearNetworkFilters?.();
  }, [clearSearch, clearNetworkFilters]);

  useEffect(() => {
    if (hideNetworkFilter) {
      setFilteredTokensByNetwork(tokens);
    }
  }, [hideNetworkFilter, tokens]);

  useEffect(() => {
    const visibleTokenCount = filteredTokens.length + highlightedAssets.length;
    setAssetListSize(visibleTokenCount ? visibleTokenCount.toString() : '');
  }, [filteredTokens, highlightedAssets.length, setAssetListSize]);

  useEffect(() => {
    if (searchQuery.length) {
      setSearchAssetFilterMethod();
    } else {
      setNoneAssetFilterMethod();
    }
  }, [searchQuery, setNoneAssetFilterMethod, setSearchAssetFilterMethod]);

  return (
    <Box twClassName="flex-1">
      {highlightedActions.length > 0 && (
        <Box>
          {highlightedActions.map((item, index) => (
            <HighlightedAction
              key={`highlighted-action-${item.name}-${index}`}
              item={item}
            />
          ))}
        </Box>
      )}
      <Box twClassName="w-full px-4 py-2">
        <TextFieldSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            hideNfts
              ? strings('send.search_tokens')
              : strings('send.search_tokens_and_nfts')
          }
          onPressClearButton={clearSearch}
        />
      </Box>
      {!hideNetworkFilter && (
        <NetworkFilter
          tokens={tokens}
          onFilteredTokensChange={handleFilteredTokensChange}
          onNetworkFilterStateChange={handleNetworkFilterStateChange}
          onExposeFilterControls={handleExposeFilterControls}
          onNetworkFilterChange={handleNetworkFilterChange}
        />
      )}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: bottomOffset,
        }}
      >
        {hasNoResults && hasActiveFilters ? (
          <Box twClassName="items-center py-8 px-4">
            <Text variant={TextVariant.BodyMd} twClassName="text-center mb-4">
              {strings('send.no_tokens_match_filters')}
            </Text>
            <Button
              variant={ButtonVariant.Secondary}
              onPress={handleClearAllFilters}
            >
              {strings('send.clear_filters')}
            </Button>
          </Box>
        ) : hasNoResults && !hasActiveFilters ? (
          <Box twClassName="items-center py-8 px-4">
            <Text variant={TextVariant.BodyMd} twClassName="text-center">
              {strings('send.no_assets_available')}
            </Text>
          </Box>
        ) : (
          <>
            {!hideNfts &&
              (filteredTokens.length > 0 || highlightedAssets.length > 0) && (
                <Text
                  twClassName="m-4 mt-2 mb-2"
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('send.tokens')}
                </Text>
              )}
            <TokenList
              tokens={filteredTokens}
              highlightedAssets={highlightedAssets}
              onSelect={onTokenSelect}
            />
            {!hideNfts && (
              <>
                {filteredNfts.length > 0 && (
                  <Text
                    twClassName="m-4 mt-4 mb-4"
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    fontWeight={FontWeight.Medium}
                  >
                    {strings('send.nfts')}
                  </Text>
                )}
                <NftList nfts={filteredNfts} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </Box>
  );
};
