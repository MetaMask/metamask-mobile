import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  HeaderStandard,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { Text } from '../../primitives/Text';
import { View } from '../../primitives/View';
import { collectiblesTestIds } from '../Collectibles.testIds';

// Coming Soon placeholder until the Market story lands.
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
      <View className="flex-1 items-center justify-center px-6">
        <Text variant={TextVariant.HeadingSm} color={TextColor.TextAlternative}>
          {strings('collectibles.market.coming_soon')}
        </Text>
      </View>
    </View>
  );
}
