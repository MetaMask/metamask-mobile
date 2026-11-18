import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';

function CollectiblesHomeScreen() {
  const tw = useTailwind();
  const navigation = useNavigation();

  return (
    <SafeAreaView edges={['top']} style={tw.style('flex-1 bg-default')}>
      <HeaderStandard
        title={strings('collectibles.placeholder.main')}
        onBack={() => navigation.goBack()}
      />
      <View style={tw.style('flex-1 items-center justify-center p-4')}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('collectibles.placeholder.coming_soon')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default CollectiblesHomeScreen;
