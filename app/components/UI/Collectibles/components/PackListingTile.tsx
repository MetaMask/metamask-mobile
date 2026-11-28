import React from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
import type { ListedPack } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Pressable } from '../../primitives/Pressable';
import { View } from '../../primitives/View';
import { PackArt } from './PackArt';
import { getOpensLabel } from './PackOpensBadge';

interface Props {
  pack: ListedPack;
  onOpenDetail?: (pack: ListedPack) => void;
  onOpenBuy?: (pack: ListedPack) => void;
}

export function PackListingTile({ pack, onOpenDetail, onOpenBuy }: Props) {
  const { formatCurrency } = useFormatters();
  const price = formatCurrency(pack.priceUsd, 'USD');

  return (
    <View className="gap-2" testID={collectiblesTestIds.packsTile(pack.code)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings('collectibles.packs.tile_label', {
          name: pack.name,
          opens: getOpensLabel(pack.openedCount),
        })}
        className="gap-2"
        pressedClassName="opacity-70"
        onPress={() => onOpenDetail?.(pack)}
        testID={collectiblesTestIds.packsTileDetail(pack.code)}
      >
        <PackArt
          code={pack.code}
          openedCount={pack.openedCount}
          imageUrl={pack.imageUrl}
          isBadgeAccessible={false}
        />
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
        >
          {pack.name}
        </Text>
      </Pressable>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        isFullWidth
        accessibilityLabel={strings('collectibles.packs.open_pack_price', {
          name: pack.name,
          price,
        })}
        onPress={() => onOpenBuy?.(pack)}
        testID={collectiblesTestIds.packsTileBuy(pack.code)}
      >
        {strings('collectibles.packs.open_price', { price })}
      </Button>
    </View>
  );
}
