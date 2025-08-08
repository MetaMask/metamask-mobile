import React from 'react';
import { useNavigation } from '@react-navigation/native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { Box, Text } from '@metamask/design-system-react-native';

import { useTheme } from '../../../../../../util/theme';
import TabBar from '../../../../../../component-library/components-temp/TabBar/TabBar';
import TextFieldSearch from '../../../../../../component-library/components/Form/TextFieldSearch';
import { TextFieldSize } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import { useSelectedEVMAccountTokens } from '../../../hooks/send/evm/useSelectedEVMAccountTokens';
import { useTokenSearch } from '../../../hooks/send/useTokenSearch';
import { useSendActions } from '../../../hooks/send/useSendActions';
import { useSendAssetNavbar } from '../../UI/navbar/navbar';
import { TokenList } from '../../token-list';

export const Asset = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { handleCancelPress } = useSendActions();
  const tokens = useSelectedEVMAccountTokens();
  const { searchQuery, setSearchQuery, filteredTokens, clearSearch } =
    useTokenSearch(tokens);

  navigation.setOptions({
    ...useSendAssetNavbar({ theme, onClose: handleCancelPress }),
  });

  return (
    <Box twClassName="flex-1 px-4">
      <Box twClassName="w-full py-2">
        <TextFieldSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search"
          size={TextFieldSize.Md}
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
