import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { PacksView } from '../views/PacksView';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function PacksScreen() {
  const navigation = useNavigation();

  return (
    <View
      className="flex-1 bg-default"
      testID={collectiblesTestIds.packsScreen}
    >
      <HeaderStandard
        title={strings('collectibles.landing.packs')}
        backButtonProps={{ testID: collectiblesTestIds.packsBackButton }}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <PacksView />
    </View>
  );
}
