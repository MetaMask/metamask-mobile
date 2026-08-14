import React, { useEffect } from 'react';
import { Box } from '@metamask/design-system-react-native';
import Tokens from '../../UI/Tokens';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';

const TokensFullView = () => {
  useEffect(
    () => () => {
      Engine.context.PreferencesController.setTokenSortConfig(
        DEFAULT_TOKEN_SORT_CONFIG,
      );
    },
    [],
  );

  return (
    <>
      <AssetPollingProvider />
      <Box twClassName="flex-1 bg-default">
        <Tokens isFullView />
      </Box>
    </>
  );
};

TokensFullView.displayName = 'TokensFullView';

export default TokensFullView;
