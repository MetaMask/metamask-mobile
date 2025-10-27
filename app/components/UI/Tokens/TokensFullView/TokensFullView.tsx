import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import Tokens from '../index';

interface TokenListNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

const TokensFullView = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<TokenListNavigationParamList, 'AddAsset'>
    >();
  const tw = useTailwind();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={tw`flex-1 bg-default pb-4`}>
      <Box twClassName="flex-1 bg-default">
        <BottomSheetHeader onBack={handleBackPress}>
          {strings('wallet.tokens')}
        </BottomSheetHeader>
        <Tokens isFullView />
      </Box>
    </SafeAreaView>
  );
};

TokensFullView.displayName = 'TokensFullView';

export default TokensFullView;
