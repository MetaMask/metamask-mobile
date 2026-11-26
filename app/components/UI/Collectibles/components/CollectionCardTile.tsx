import React, { useState } from 'react';
import {
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
import { collectiblesTestIds } from '../Collectibles.testIds';
import type { PackPartnerCard } from '../providers/pack-partner/types/packPartner';
import { CapsuleGlass } from '../../primitives/CapsuleGlass';
import { Image } from '../../primitives/Image';
import { Pressable } from '../../primitives/Pressable';
import { Text } from '../../primitives/Text';
import { View } from '../../primitives/View';

interface Props {
  card: PackPartnerCard;
  buybackLabel?: string;
  onPress?: (card: PackPartnerCard) => void;
}

export function CollectionCardTile({ card, buybackLabel, onPress }: Props) {
  const { formatCurrency } = useFormatters();

  const [failedImageUrl, setFailedImageUrl] = useState<string>();

  const imageUrl = card.mediumImage ?? card.image;
  const value =
    card.insuredValue === undefined
      ? strings('collectibles.collection.no_value')
      : formatCurrency(card.insuredValue, 'USD', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings('collectibles.collection.card_label', {
        name: card.name,
        value,
      })}
      className="gap-2"
      pressedClassName="opacity-70"
      onPress={() => onPress?.(card)}
      testID={collectiblesTestIds.collectionTile(card.mint)}
    >
      <View className="overflow-hidden rounded-xl bg-muted p-2">
        {imageUrl && failedImageUrl !== imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            contentFit="contain"
            className="h-56 w-full rounded-lg"
            onError={() => setFailedImageUrl(imageUrl)}
          />
        ) : (
          <View className="h-56 w-full rounded-lg bg-alternative" />
        )}
        {buybackLabel ? (
          <View
            className="absolute left-2 top-2"
            testID={collectiblesTestIds.collectionBuyback(card.mint)}
          >
            <CapsuleGlass className="h-6 px-2">
              <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}>
                {buybackLabel}
              </Text>
            </CapsuleGlass>
          </View>
        ) : null}
      </View>
      <View>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
        >
          {card.name}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}
