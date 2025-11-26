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

import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import TextFieldSearch from '../../../../../../component-library/components/Form/TextFieldSearch';
import { TextFieldSize } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import { useAssetSelectionMetrics } from '../../../hooks/send/metrics/useAssetSelectionMetrics';
import { useTokenSearch } from '../../../hooks/send/useTokenSearch';
import { TokenList } from '../../token-list';
import { NftList } from '../../nft-list';

import { AssetType } from '../../../types/token';
import { NetworkFilter } from '../../network-filter';
import { useEVMNfts } from '../../../hooks/send/useNfts';
import { useSendTokens } from '../../../hooks/send/useSendTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';

export interface AssetProps {
  hideNfts?: boolean;
  includeNoBalance?: boolean;
  onTokenSelect?: (token: AssetType) => void;
  tokenFilter?: (assets: AssetType[]) => AssetType[];
}

export const Asset: React.FC<AssetProps> = (props = {}) => {
  const {
    hideNfts = false,
    includeNoBalance = false,
    onTokenSelect,
    tokenFilter,
  } = props;

  const originalTokens = useSendTokens({ includeNoBalance });

  const tokens = useMemo(
    () => (tokenFilter ? tokenFilter(originalTokens) : originalTokens),
    [originalTokens, tokenFilter],
  );

  const nfts = useEVMNfts();
  const [filteredTokensByNetwork, setFilteredTokensByNetwork] =
    useState<AssetType[]>(tokens);
  const [selectedNetworkFilter, setSelectedNetworkFilter] =
    useState<string>('all');
  const theme = useTheme();
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
  const hasNoResults = filteredTokens.length === 0 && filteredNfts.length === 0;

  const handleClearAllFilters = useCallback(() => {
    clearSearch();
    clearNetworkFilters?.();
  }, [clearSearch, clearNetworkFilters]);

  useEffect(() => {
    setAssetListSize(
      filteredTokens?.length ? filteredTokens?.length.toString() : '',
    );
  }, [filteredTokens, setAssetListSize]);

  useEffect(() => {
    if (searchQuery.length) {
      setSearchAssetFilterMethod();
    } else {
      setNoneAssetFilterMethod();
    }
  }, [searchQuery, setNoneAssetFilterMethod, setSearchAssetFilterMethod]);

  return (
    <Box twClassName="flex-1">
      <Box twClassName="w-full px-4 py-2">
        <TextFieldSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            hideNfts
              ? strings('send.search_tokens')
              : strings('send.search_tokens_and_nfts')
          }
          size={TextFieldSize.Lg}
          showClearButton={searchQuery.length > 0}
          onPressClearButton={clearSearch}
          style={{
            borderColor: theme.colors.border.muted,
          }}
        />
      </Box>
      <NetworkFilter
        tokens={tokens}
        onFilteredTokensChange={handleFilteredTokensChange}
        onNetworkFilterStateChange={handleNetworkFilterStateChange}
        onExposeFilterControls={handleExposeFilterControls}
        onNetworkFilterChange={handleNetworkFilterChange}
      />
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
            {!hideNfts && filteredTokens.length > 0 && (
              <Text
                twClassName="m-4 mt-2 mb-2"
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('send.tokens')}
              </Text>
            )}
            <TokenList tokens={filteredTokens} onSelect={onTokenSelect} />
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
