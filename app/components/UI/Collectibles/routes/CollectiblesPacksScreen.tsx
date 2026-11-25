import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { CollectiblesPacksView } from '../views/CollectiblesPacksView';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function CollectiblesPacksScreen() {
  const navigation = useNavigation();

  return (
    <View
      className="flex-1 bg-default"
      testID={collectiblesTestIds.packsScreen}
    >
      <HeaderStandard
        title={strings('collectibles.landing.packs')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <CollectiblesPacksView />
    </View>
  );
}
