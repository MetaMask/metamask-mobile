import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import NftGrid from '../../UI/NftGrid/NftGrid';

const NftFullView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default pb-4', { paddingTop: insets.top })}
      edges={['left', 'right', 'bottom']}
    >
      <HeaderStandard
        title={strings('wallet.collectibles')}
        titleProps={{ accessibilityRole: 'header' }}
        onBack={handleBackPress}
        backButtonProps={{ testID: 'back-button' }}
      />
      <Box twClassName="flex-1">
        <NftGrid isFullView />
      </Box>
    </SafeAreaView>
  );
};

export default NftFullView;
