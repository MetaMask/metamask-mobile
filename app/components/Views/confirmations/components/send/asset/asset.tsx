import React, { useEffect } from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { strings } from '../../../../../../../locales/i18n';
import TextFieldSearch from '../../../../../../component-library/components/Form/TextFieldSearch';
import { TextFieldSize } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import { useAssetSelectionMetrics } from '../../../hooks/send/metrics/useAssetSelectionMetrics';
import { useSelectedEVMAccountTokens } from '../../../hooks/send/evm/useSelectedEVMAccountTokens';
import { useTokenSearch } from '../../../hooks/send/useTokenSearch';
import { TokenList } from '../../token-list';

export const Asset = () => {
  const tokens = useSelectedEVMAccountTokens();
  const { searchQuery, setSearchQuery, filteredTokens, clearSearch } =
    useTokenSearch(tokens);
  const {
    setAssetListSize,
    setNoneAssetFilterMethod,
    setSearchAssetFilterMethod,
  } = useAssetSelectionMetrics();

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
      <ScrollView>
        <Text
          twClassName="m-4"
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
        >
          {strings('send.tokens')}
        </Text>
        <TokenList tokens={filteredTokens} />
        <Text
          twClassName="m-4"
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
        >
          {strings('send.nfts')}
        </Text>
        <Text
          twClassName="ml-4"
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Regular}
        >
          NFTs implementation coming soon.
        </Text>
      </ScrollView>
    </Box>
  );
};
