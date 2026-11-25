import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { MarketView } from '../views/MarketView';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function MarketScreen() {
  const navigation = useNavigation();

  return (
    <View
      className="flex-1 bg-default"
      testID={collectiblesTestIds.marketScreen}
    >
      <HeaderStandard
        title={strings('collectibles.landing.market')}
        backButtonProps={{ testID: collectiblesTestIds.marketBackButton }}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <MarketView />
    </View>
  );
}
