import React from 'react';
<<<<<<< HEAD
import {
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import type { HomePack } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';
import { CapsuleGlass } from '../../primitives/CapsuleGlass';
=======
import { TextColor, TextVariant } from '@metamask/design-system-react-native';
import type { HomePack } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';
import { PackArt } from './PackArt';
>>>>>>> origin/main

export const packTileWidth = 192;

interface Props {
  pack: HomePack;
  width?: number;
}

export function PackTile({ pack, width = packTileWidth }: Props) {
  return (
    <View
      className="gap-2"
      style={{ width }}
      testID={collectiblesTestIds.tile(pack.code)}
    >
      <PackArt
        code={pack.code}
        openedCount={pack.openedCount}
        className="p-3"
        artClassName="h-[276px]"
      />
      <View>
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {pack.name}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {pack.priceLabel}
        </Text>
      </View>
    </View>
  );
}
