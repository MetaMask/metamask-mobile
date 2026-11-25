import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { CollectiblesHomeView } from '../views/CollectiblesHomeView';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function CollectiblesHomeScreen() {
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-default" testID={collectiblesTestIds.landing}>
      <HeaderStandard
        title={strings('collectibles.title')}
        backButtonProps={{ testID: collectiblesTestIds.homeBackButton }}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <CollectiblesHomeView />
    </View>
  );
}
