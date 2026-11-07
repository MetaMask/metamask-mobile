import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, HeaderRoot } from '@metamask/design-system-react-native';
import NftGrid from '../../UI/NftGrid/NftGrid';
import FixedTabRow from '../../Nav/Main/FixedTabNav/FixedTabRow';
import { FixedHubChrome } from '../../Nav/Main/FixedTabNav/FixedHubChrome';
import HubProfileButton from '../../Nav/Main/FixedTabNav/HubProfileButton';

const NftFullView = () => {
  const tw = useTailwind();

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default pb-4')}
      edges={['left', 'right', 'bottom']}
    >
      <FixedHubChrome>
        <HeaderRoot includesTopInset>
          <HubProfileButton />
        </HeaderRoot>
        <FixedTabRow />
      </FixedHubChrome>
      <Box twClassName="flex-1">
        <NftGrid isFullView />
      </Box>
    </SafeAreaView>
  );
};

export default NftFullView;
