import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { ScrollView } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import TextFieldSearch from '../../../../../../component-library/components/Form/TextFieldSearch';
import { TextFieldSize } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import { useAssetSelectionMetrics } from '../../../hooks/send/metrics/useAssetSelectionMetrics';
import { useSelectedEVMAccountTokens } from '../../../hooks/send/evm/useSelectedEVMAccountTokens';
import { useTokenSearch } from '../../../hooks/send/useTokenSearch';
import { TokenList } from '../../token-list';
import { AssetType } from '../../../types/token';
import { NetworkFilter } from '../../network-filter';

export const Asset = () => {
  const tokens = useSelectedEVMAccountTokens();
  const [filteredTokensByNetwork, setFilteredTokensByNetwork] =
    useState<AssetType[]>(tokens);
  const { searchQuery, setSearchQuery, filteredTokens, clearSearch } =
    useTokenSearch(filteredTokensByNetwork);
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

  const handleExposeFilterControls = useCallback((clearFilters: () => void) => {
    setClearNetworkFilters(() => clearFilters);
  }, []);

  const hasActiveFilters = searchQuery.length > 0 || hasActiveNetworkFilter;

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
          placeholder={strings('send.search_tokens_and_nfts')}
          size={TextFieldSize.Lg}
          showClearButton={searchQuery.length > 0}
          onPressClearButton={clearSearch}
        />
      </Box>
      <NetworkFilter
        tokens={tokens}
        onFilteredTokensChange={handleFilteredTokensChange}
        onNetworkFilterStateChange={handleNetworkFilterStateChange}
        onExposeFilterControls={handleExposeFilterControls}
      />
      <ScrollView>
        {filteredTokens.length > 0 && (
          <Text
            twClassName="m-4 mt-2"
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
          >
            {strings('send.tokens')}
          </Text>
        )}
        <TokenList
          tokens={filteredTokens}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            clearSearch();
            clearNetworkFilters?.();
          }}
        />
      </ScrollView>
    </Box>
  );
};
