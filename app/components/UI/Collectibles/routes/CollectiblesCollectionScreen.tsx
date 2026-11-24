import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { collectiblesTestIds } from '../Collectibles.testIds';

// Placeholder until GAC-75 fills it.
export function CollectiblesCollectionScreen() {
  const navigation = useNavigation();

  return (
    <View
      className="flex-1 bg-default"
      testID={collectiblesTestIds.collectionScreen}
    >
      <HeaderStandard
        title={strings('collectibles.landing.collection')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
    </View>
  );
}
