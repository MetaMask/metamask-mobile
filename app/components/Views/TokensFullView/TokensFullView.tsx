import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Tokens from '../../UI/Tokens';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';

const TokensFullView = () => {
  const navigation = useNavigation();

  useEffect(
    () => () => {
      Engine.context.PreferencesController.setTokenSortConfig(
        DEFAULT_TOKEN_SORT_CONFIG,
      );
    },
    [],
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <>
      <AssetPollingProvider />
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          testID="header"
          title={strings('wallet.tokens')}
          titleProps={{ testID: 'header-title' }}
          onBack={handleBackPress}
          backButtonProps={{ testID: 'back-button' }}
          includesTopInset
        />
        <Tokens isFullView />
      </Box>
    </>
  );
};

TokensFullView.displayName = 'TokensFullView';

export default TokensFullView;
