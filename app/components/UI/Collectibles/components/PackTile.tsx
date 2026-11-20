import React from 'react';
import {
  ButtonSize,
  ButtonVariant,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { HomePack } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';
import { Button } from '../../primitives/Button';
import { CapsuleGlass } from '../../primitives/CapsuleGlass';

// Tile width in px. The carousel snaps by it too.
export const packTileWidth = 192;

interface Props {
  pack: HomePack;
}

export function PackTile({ pack }: Props) {
  return (
    <View
      className="gap-2"
      style={{ width: packTileWidth }}
      testID={collectiblesTestIds.tile(pack.code)}
    >
      {/* TODO: open the pack detail once Collectibles has routes */}
      <View className="overflow-hidden rounded-xl bg-muted p-3">
        {/* Grey placeholder until pack art comes from a remote host */}
        <View className="h-[276px] w-full rounded-lg bg-alternative" />
        <View className="absolute left-2 top-2">
          <CapsuleGlass className="h-6 px-2">
            <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}>
              {pack.counterLabel}
            </Text>
          </CapsuleGlass>
        </View>
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
        {/* TODO: wire Open once the buy flow and routes exist */}
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          className="mt-1 max-w-full self-start"
          textProps={{ ellipsizeMode: 'tail' }}
          testID={collectiblesTestIds.openButton(pack.code)}
        >
          {strings('collectibles.home_section.open_collectibles')}
        </Button>
      </View>
    </View>
  );
}
