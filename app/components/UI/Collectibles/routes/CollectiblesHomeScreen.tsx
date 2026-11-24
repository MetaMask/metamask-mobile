import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';

export function CollectiblesHomeScreen() {
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-default">
      <HeaderStandard
        title={strings('collectibles.title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
    </View>
  );
}
