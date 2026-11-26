import React, { type ReactNode } from 'react';
import { TextColor, TextVariant } from '@metamask/design-system-react-native';
import type { HomePack } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';
import { PackArt } from './PackArt';

export const packTileWidth = 192;

interface Props {
  pack: HomePack;
  width?: number;
  badge?: ReactNode;
  caption?: string;
}

export function PackTile({
  pack,
  width = packTileWidth,
  badge,
  caption,
}: Props) {
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
        badge={badge}
      />
      <View>
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {pack.name}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {pack.priceLabel}
        </Text>
        {caption ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
