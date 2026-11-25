import React from 'react';
import { TextColor, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { Text } from '../../primitives/Text';
import { View } from '../../primitives/View';

export function MarketView() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text variant={TextVariant.HeadingSm} color={TextColor.TextAlternative}>
        {strings('collectibles.market.coming_soon')}
      </Text>
    </View>
  );
}
