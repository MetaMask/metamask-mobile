import React, { useState } from 'react';
import {
  ButtonSize,
  ButtonVariant,
  FontWeight,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
import type { ListedPack } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Button } from '../../primitives/Button';
import { Image } from '../../primitives/Image';
import { Pressable } from '../../primitives/Pressable';
import { Text } from '../../primitives/Text';
import { View } from '../../primitives/View';
import { getOpensLabel, PackOpensBadge } from './PackOpensBadge';

interface Props {
  pack: ListedPack;
  onOpenDetail?: (pack: ListedPack) => void;
  onOpenBuy?: (pack: ListedPack) => void;
}

export function PacksGridTile({ pack, onOpenDetail, onOpenBuy }: Props) {
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  const hasArtFailed = failedImageUrl === pack.imageUrl;
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
        <View className="overflow-hidden rounded-xl bg-muted p-2">
          {pack.imageUrl && !hasArtFailed ? (
            <Image
              source={{ uri: pack.imageUrl }}
              contentFit="contain"
              className="h-56 w-full rounded-lg"
              onError={() => setFailedImageUrl(pack.imageUrl)}
              testID={collectiblesTestIds.packsTileArt(pack.code)}
            />
          ) : (
            <View
              className="h-56 w-full rounded-lg bg-alternative"
              testID={collectiblesTestIds.packsTileArtPlaceholder(pack.code)}
            />
          )}
          <PackOpensBadge
            className="absolute left-2 top-2"
            code={pack.code}
            openedCount={pack.openedCount}
            isAccessible={false}
          />
        </View>
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
