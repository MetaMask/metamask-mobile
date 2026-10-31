import React, { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  Box,
  HeaderStandard,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Tokens from '../../UI/Tokens';
import { goToAddEvmToken } from '../../UI/Tokens/util';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { selectChainId } from '../../../selectors/networkController';
import { getDecimalChainId } from '../../../util/networks';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';

const TokensFullView = () => {
  const navigation = useNavigation<AppNavigationProp>();

  useEffect(
    () => () => {
      Engine.context.PreferencesController.setTokenSortConfig(
        DEFAULT_TOKEN_SORT_CONFIG,
      );
    },
    [],
  );

  const { trackEvent, createEventBuilder } = useAnalytics();
  const currentChainId = useSelector(selectChainId);

  const goToAddToken = useCallback(() => {
    goToAddEvmToken({
      navigation,
      trackEvent,
      createEventBuilder,
      getDecimalChainId,
      currentChainId,
    });
  }, [navigation, trackEvent, createEventBuilder, currentChainId]);

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
          endButtonIconProps={[
            {
              iconName: IconName.Add,
              onPress: goToAddToken,
              // Same ID the control bar's add button used, so existing E2E selectors keep working.
              testID: 'import-token-button',
            },
          ]}
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
