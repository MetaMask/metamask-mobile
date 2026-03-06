import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  HeaderBase,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Tokens from '../../UI/Tokens';

/**
 * Full view for Cash (mUSD-only) token list.
 * Shows mUSD positions across all supported networks (Ethereum Mainnet, Linea, etc.).
 */
const CashTokensFullView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={tw`flex-1 bg-default pb-4`}>
      <HeaderBase
        startAccessory={
          <ButtonIcon
            size={ButtonIconSize.Md}
            onPress={handleBackPress}
            iconName={IconName.ArrowLeft}
            testID="back-button"
          />
        }
        style={tw`p-4`}
        twClassName="h-auto"
      >
        {strings('homepage.sections.cash')}
      </HeaderBase>
      <Tokens isFullView showOnlyMusd />
    </SafeAreaView>
  );
};

CashTokensFullView.displayName = 'CashTokensFullView';

export default CashTokensFullView;
