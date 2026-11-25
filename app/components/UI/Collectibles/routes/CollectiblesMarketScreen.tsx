import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { CollectiblesMarketView } from '../views/CollectiblesMarketView';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function CollectiblesMarketScreen() {
  const navigation = useNavigation();

  return (
    <View
      className="flex-1 bg-default"
      testID={collectiblesTestIds.marketScreen}
    >
      <HeaderStandard
        title={strings('collectibles.landing.market')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <CollectiblesMarketView />
    </View>
  );
}
