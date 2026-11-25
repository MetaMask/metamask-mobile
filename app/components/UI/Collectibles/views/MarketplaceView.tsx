import React from 'react';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function MarketplaceView() {
  return (
    <View
      className="flex-1 items-center justify-center px-6"
      testID={collectiblesTestIds.marketplaceView}
    >
      <Text variant={TextVariant.HeadingSm} color={TextColor.TextAlternative}>
        {strings('collectibles.marketplace.coming_soon')}
      </Text>
    </View>
  );
}
