import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import HeaderBase from '../../../component-library/components/HeaderBase';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import Tokens from '../../UI/Tokens';

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
      <HeaderBase
        startAccessory={
          <ButtonIcon
            size={ButtonIconSizes.Lg}
            onPress={handleBackPress}
            iconName={IconName.ArrowLeft}
            testID="back-button"
          />
        }
        style={tw`p-4`}
        twClassName="h-auto"
      >
        {strings('wallet.tokens')}
      </HeaderBase>
      <Tokens isFullView />
    </SafeAreaView>
  );
};

TokensFullView.displayName = 'TokensFullView';

export default TokensFullView;
