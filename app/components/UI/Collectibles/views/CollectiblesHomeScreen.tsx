import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  HeaderStandard,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';

export function CollectiblesHomeScreen() {
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-default" style={{ paddingTop: top }}>
      <HeaderStandard
        title={strings('collectibles.placeholder.main')}
        onBack={() => navigation.goBack()}
      />
      <View className="flex-1 items-center justify-center p-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('collectibles.placeholder.coming_soon')}
        </Text>
      </View>
    </View>
  );
}
