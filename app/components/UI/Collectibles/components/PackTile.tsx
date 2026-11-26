import React from 'react';
import { useLinkProps } from '@react-navigation/native';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { HomePack } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';
import { Pressable } from '../../primitives/Pressable';
import { collectiblesRoutes, type CollectiblesParamList } from '../routeNames';
import { PackArt } from './PackArt';

export const packTileWidth = 192;

interface Props {
  pack: HomePack;
  width?: number;
}

export function PackTile({ pack, width = packTileWidth }: Props) {
  const buySheetLink = useLinkProps<CollectiblesParamList>({
    screen: collectiblesRoutes.buySheet,
    params: { packCode: pack.code },
  });

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
        <Pressable
          {...buySheetLink}
          role="button"
          accessibilityRole="button"
          className="self-start"
          pressedClassName="opacity-70"
          accessibilityHint={strings('collectibles.buy_sheet.open_hint', {
            name: pack.name,
          })}
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
