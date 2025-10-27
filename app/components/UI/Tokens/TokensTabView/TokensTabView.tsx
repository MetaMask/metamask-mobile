import React, { memo } from 'react';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { Box } from '@metamask/design-system-react-native';
import Tokens from '../index';

const TokensTabView = memo(() => (
  <Box
    twClassName="flex-1 bg-default"
    testID={WalletViewSelectorsIDs.TOKENS_CONTAINER}
  >
    <Tokens isFullView={false} />
  </Box>
));

TokensTabView.displayName = 'TokensTabView';

export default TokensTabView;
