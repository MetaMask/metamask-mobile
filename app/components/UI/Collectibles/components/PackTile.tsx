import React from 'react';
import { useLinkProps } from '@react-navigation/native';
import {
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { HomePack } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';
import { CapsuleGlass } from '../../primitives/CapsuleGlass';
import { Pressable } from '../../primitives/Pressable';
import { collectiblesRoutes, type CollectiblesParamList } from '../routeNames';

// Tile width in px. The carousel snaps by it too.
export const packTileWidth = 192;

interface Props {
  pack: HomePack;
}

export function PackTile({ pack }: Props) {
  const buySheetLink = useLinkProps<CollectiblesParamList>({
    screen: collectiblesRoutes.buySheet,
    params: { packCode: pack.code },
  });

  return (
    <View
      className="gap-2"
      style={{ width: packTileWidth }}
      testID={collectiblesTestIds.tile(pack.code)}
    >
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
        <Pressable
          {...buySheetLink}
          className="self-start"
          pressedClassName="opacity-70"
          accessibilityHint={strings('collectibles.buy_sheet.open_hint', {
            name: pack.name,
          })}
          // Grows the small text target to about 44pt.
          hitSlop={11}
          testID={collectiblesTestIds.buyButton(pack.code)}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {pack.priceLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
