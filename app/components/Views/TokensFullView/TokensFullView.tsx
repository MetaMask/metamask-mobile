import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Tokens from '../../UI/Tokens';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { selectHomeBrandRefreshSurfacesEnabled } from '../../../selectors/featureFlagController/homeBrandRefreshSurfaces';

const TokensFullView = () => {
  const isGlassHeader =
    useSelector(selectHomeBrandRefreshSurfacesEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();

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
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
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
