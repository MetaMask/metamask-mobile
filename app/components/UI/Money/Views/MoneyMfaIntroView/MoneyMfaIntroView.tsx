import React, { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyMfa } from '../../hooks/useMoneyMfa';
import {
  MoneyMfaPasskeyIntro,
  MoneyMfaTestIds,
} from '../../components/MoneyMfa';

/** Full-screen passkey intro opened from the Money home card. */
const MoneyMfaIntroView = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { turnOn } = useMoneyMfa();

  const handleAddPasskey = useCallback(() => {
    navigation.goBack();
    void turnOn();
  }, [navigation, turnOn]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <Box twClassName="px-2 py-2">
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={navigation.goBack}
          accessibilityLabel={strings('navigation.back')}
          testID={MoneyMfaTestIds.INTRO_BACK_BUTTON}
        />
      </Box>
      <MoneyMfaPasskeyIntro onAddPasskey={handleAddPasskey} isFullScreen />
    </SafeAreaView>
  );
};

export default MoneyMfaIntroView;
