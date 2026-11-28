import React, { useState } from 'react';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
import { collectiblesTestIds } from '../Collectibles.testIds';
import type { PackPartnerCard } from '../providers/pack-partner/types/packPartner';
import { rarityBorderClassNames } from '../utils/rarity';
import { Image } from '../../primitives/Image';
import { Pressable } from '../../primitives/Pressable';
import { Skeleton } from '../../primitives/Skeleton';
import { View } from '../../primitives/View';
import { ArtworkFallback } from './ArtworkFallback';

interface Props {
  card: PackPartnerCard;
  className?: string;
  onPress?: (card: PackPartnerCard) => void;
}

export function CardListItem({ card, className = '', onPress }: Props) {
  const { formatCurrency } = useFormatters();

  const [failedImageUrl, setFailedImageUrl] = useState<string>();

  const imageUrl = card.mediumImage ?? card.image;
  const frameClassName = card.rarity
    ? rarityBorderClassNames[card.rarity]
    : 'border-muted';
  const identity = [card.year, card.set].filter(Boolean).join(' ');
  const grade = [card.gradingCompany, card.grade].filter(Boolean).join(' ');
  const value =
    card.insuredValue === undefined
      ? strings('collectibles.pack_detail.no_value')
      : formatCurrency(card.insuredValue, 'USD', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings('collectibles.pack_detail.card_label', {
        name: card.name,
        value,
      })}
      className={`gap-2 ${className}`}
      pressedClassName="opacity-70"
      disabled={!onPress}
      onPress={() => onPress?.(card)}
      testID={collectiblesTestIds.cardListItem(card.mint)}
    >
      <View
        className={`overflow-hidden rounded-xl border-2 bg-muted p-2 ${frameClassName}`}
      >
        {imageUrl && failedImageUrl !== imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            contentFit="contain"
            className="aspect-[2/3] w-full rounded-lg"
            onError={() => setFailedImageUrl(imageUrl)}
            testID={collectiblesTestIds.cardListItemArt(card.mint)}
          />
        ) : (
          <ArtworkFallback
            className="aspect-[2/3] w-full rounded-lg"
            testID={collectiblesTestIds.cardListItemArtFallback(card.mint)}
          />
        )}
      </View>
      <View>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
        >
          {card.name}
        </Text>
        {identity ? (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {identity}
          </Text>
        ) : null}
        <Text variant={TextVariant.BodyXs} numberOfLines={1}>
          {grade
            ? strings('collectibles.pack_detail.value_grade', { value, grade })
            : value}
        </Text>
      </View>
    </Pressable>
  );
}

interface SkeletonProps {
  className?: string;
}

export function CardListItemSkeleton({ className = '' }: SkeletonProps) {
  return (
    <View className={`gap-2 ${className}`}>
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </View>
  );
}
