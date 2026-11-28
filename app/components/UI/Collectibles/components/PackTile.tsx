import React, { type ReactNode } from 'react';
import { useLinkProps } from '@react-navigation/native';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
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
  badge?: ReactNode;
  caption?: string;
}

export function PackTile({
  pack,
  width = packTileWidth,
  badge,
  caption,
}: Props) {
  const { formatCurrency } = useFormatters();

  const detailLink = useLinkProps<CollectiblesParamList>({
    screen: collectiblesRoutes.root,
    params: {
      screen: collectiblesRoutes.packDetail,
      params: { packCode: pack.code },
    },
  });

  const buySheetLink = useLinkProps<CollectiblesParamList>({
    screen: collectiblesRoutes.buySheet,
    params: { packCode: pack.code, name: pack.name, priceUsd: pack.priceUsd },
  });

  return (
    <View
      className="gap-2"
      style={{ width }}
      testID={collectiblesTestIds.tile(pack.code)}
    >
      <Pressable
        {...detailLink}
        role="button"
        accessibilityRole="button"
        accessibilityLabel={pack.name}
        pressedClassName="opacity-70"
        testID={collectiblesTestIds.tileDetail(pack.code)}
      >
        <PackArt
          code={pack.code}
          openedCount={pack.openedCount}
          className="p-3"
          artClassName="h-[276px]"
          badge={badge}
        />
      </Pressable>
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
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {formatCurrency(pack.priceUsd, 'USD')}
          </Text>
        </Pressable>
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
