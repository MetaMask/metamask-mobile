import React from 'react';
import { TextColor, TextVariant } from '@metamask/design-system-react-native';
import type { HomePack } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';
import { PackOpensBadge } from './PackOpensBadge';

// Tile width in px (w-48). The carousel snaps by it too.
export const packTileWidth = 192;

interface Props {
  pack: HomePack;
}

export function PackTile({ pack }: Props) {
  return (
    <View className="w-48 gap-2" testID={collectiblesTestIds.tile(pack.code)}>
      <View className="overflow-hidden rounded-xl bg-muted p-3">
        {/* Grey placeholder until pack art comes from a remote host */}
        <View className="h-[276px] w-full rounded-lg bg-alternative" />
        <PackOpensBadge
          className="absolute left-2 top-2"
          code={pack.code}
          openedCount={pack.openedCount}
        />
      </View>
      <View>
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {pack.name}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {pack.subtitle}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {pack.priceLabel}
        </Text>
      </View>
    </View>
  );
}
