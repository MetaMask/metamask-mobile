import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { CollectionView } from '../views/CollectionView';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function CollectionScreen() {
  const navigation = useNavigation();

  return (
    <View
      className="flex-1 bg-default"
      testID={collectiblesTestIds.collectionScreen}
    >
      <HeaderStandard
        title={strings('collectibles.landing.collection')}
        backButtonProps={{ testID: collectiblesTestIds.collectionBackButton }}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <CollectionView />
    </View>
  );
}
