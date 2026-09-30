import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  FontWeight,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { GachaCardTileTestIds } from '../../Gacha.testIds';
import type { CollectorCryptCard } from '../../providers/collector-crypt/types';
import {
  formatUsd,
  formatUsdcAmount,
} from '../../providers/collector-crypt/utils/format';
import CardImage from '../CardImage';
import { getGradeLabel } from '../CardDisplay/cardLabels';

export interface CardTileProps {
  card: CollectorCryptCard;
  onPress: (mint: string) => void;
  testID?: string;
}

/** "PSA 10 · $45": grade and value, whichever is known. */
export const getCardTileSubtitle = (card: CollectorCryptCard): string =>
  [
    getGradeLabel(card),
    card.insuredValue === undefined ? undefined : formatUsd(card.insuredValue),
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

/** Status tag of a tile: sale in progress, buyback offer, or nothing. */
const CardTileTag = ({ card }: { card: CollectorCryptCard }) => {
  if (card.sale?.status === 'pending') {
    return (
      <Tag
        severity={TagSeverity.Warning}
        testID={GachaCardTileTestIds.SELLING_TAG(card.mint)}
      >
        {strings('gacha.cards.selling_tag')}
      </Tag>
    );
  }
  if (card.buyback.status === 'available' && card.buyback.amount) {
    return (
      <Tag
        severity={TagSeverity.Info}
        testID={GachaCardTileTestIds.BUYBACK_TAG(card.mint)}
      >
        {strings('gacha.cards.sell_tag', {
          amount: strings('gacha.usdc_amount', {
            amount: formatUsdcAmount(card.buyback.amount),
          }),
        })}
      </Tag>
    );
  }
  return null;
};

/** Grid tile of a card: 5/7 image, name, grade/value and buyback tag. */
const CardTile = ({ card, onPress, testID }: CardTileProps) => {
  const tw = useTailwind();
  const handlePress = useCallback(() => onPress(card.mint), [onPress, card]);
  const subtitle = getCardTileSubtitle(card);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={card.name}
      testID={testID ?? GachaCardTileTestIds.TILE(card.mint)}
      style={({ pressed }) => tw.style('w-full', pressed && 'opacity-70')}
    >
      <CardImage uri={card.image} accessibilityLabel={card.name} />
      <Box alignItems={BoxAlignItems.Start} gap={1} marginTop={2}>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          numberOfLines={2}
          twClassName="min-h-10 w-full"
        >
          {card.name}
        </Text>
        {subtitle ? (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        <CardTileTag card={card} />
      </Box>
    </Pressable>
  );
};

export default CardTile;
