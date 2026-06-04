import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Tokens from '../../UI/Tokens';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';

const TokensFullView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

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
      <SafeAreaView
        style={tw.style('flex-1 bg-default pb-4', { paddingTop: insets.top })}
        edges={['left', 'right', 'bottom']}
      >
        <Box twClassName="flex-row items-center h-14 px-2">
          <ButtonIcon
            size={ButtonIconSize.Md}
            iconName={IconName.ArrowLeft}
            onPress={handleBackPress}
            testID="back-button"
          />
          <Box
            twClassName="absolute inset-0 items-center justify-center"
            pointerEvents="none"
          >
            <Text variant={TextVariant.HeadingSm}>
              {strings('wallet.tokens')}
            </Text>
          </Box>
        </Box>
        <Tokens isFullView />
      </SafeAreaView>
    </>
  );
};

TokensFullView.displayName = 'TokensFullView';

export default TokensFullView;
