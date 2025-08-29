import React, { useEffect } from 'react';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { Box, Text } from '@metamask/design-system-react-native';

import Routes from '../../../../../../constants/navigation/Routes';
import TabBar from '../../../../../../component-library/components-temp/TabBar/TabBar';
import TextFieldSearch from '../../../../../../component-library/components/Form/TextFieldSearch';
import { TextFieldSize } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import { useAssetSelectionMetrics } from '../../../hooks/send/metrics/useAssetSelectionMetrics';
import { useSelectedEVMAccountTokens } from '../../../hooks/send/evm/useSelectedEVMAccountTokens';
import { useTokenSearch } from '../../../hooks/send/useTokenSearch';
import { useSendNavbar } from '../../../hooks/send/useSendNavbar';
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

  useSendNavbar({ currentRoute: Routes.SEND.ASSET });

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
          placeholder="Search"
          size={TextFieldSize.Lg}
          showClearButton={searchQuery.length > 0}
          onPressClearButton={clearSearch}
        />
      </Box>
      <ScrollableTabView renderTabBar={() => <TabBar />}>
        <Box key="token-tab" {...{ tabLabel: 'Tokens' }} twClassName="flex-1">
          <TokenList tokens={filteredTokens} />
        </Box>
        <Box key="nft-tab" {...{ tabLabel: 'NFTs' }} twClassName="flex-1">
          <Text>
            NFTs - will be implemented in separate PR - Intentional empty
          </Text>
        </Box>
      </ScrollableTabView>
    </Box>
  );
};
