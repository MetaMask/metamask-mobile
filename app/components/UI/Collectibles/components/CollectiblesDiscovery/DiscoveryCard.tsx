import React, { memo } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import CardImage from '../CardImage';
import { getCardTitle } from '../CardDisplay/cardLabels';
import type { CollectiblesInventoryCard } from '../../types';
import RarityArtworkSurface from '../CardDisplay/RarityArtworkSurface';
import CardSummary from '../CardDisplay/CardSummary';
import SoldCardTreatment from '../CardDisplay/SoldCardTreatment';
import ReplitPullArrival from './ReplitPullArrival';

/** Public discovery metadata is deliberately separate from owned-card sale actions. */
export const DiscoveryCard = memo(
  ({
    card,
    onPress,
    caption,
    reserveCaption = false,
    soldLabel,
    displayValue,
    arrival,
    testID,
  }: {
    card: CollectiblesInventoryCard;
    testID?: string;
    onPress: (card: CollectiblesInventoryCard) => void;
    caption?: string;
    /** Keep a caption line in every cell when this list loads optional context. */
    reserveCaption?: boolean;
    soldLabel?: string;
    displayValue?: number | null;
    arrival?: { identity?: string; active: boolean };
  }) => {
    const tw = useTailwind();
    const image = (
      <CardImage
        aspectRatio={2 / 3}
        roundedClassName="rounded-none"
        uri={card.mediumImage ?? card.image}
        accessibilityLabel={getCardTitle(card)}
        transparent
      />
    );
    const artwork = soldLabel ? (
      <SoldCardTreatment label={soldLabel}>{image}</SoldCardTreatment>
    ) : (
      image
    );
    const copy = (
      <>
        <CardSummary card={card} value={displayValue} />
        {(reserveCaption || caption) && (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            accessibilityElementsHidden={!caption}
            importantForAccessibility={caption ? 'auto' : 'no-hide-descendants'}
            testID={`collectibles-discovery-caption-${card.mint}`}
          >
            {caption || '\u00a0'}
          </Text>
        )}
      </>
    );
    return (
      <Pressable
        onPress={() => onPress(card)}
        accessibilityRole="button"
        accessibilityLabel={getCardTitle(card)}
        style={tw.style('flex-1')}
        testID={testID ?? `collectibles-discovery-card-${card.mint}`}
      >
        {arrival ? (
          <ReplitPullArrival
            identity={arrival.identity}
            active={arrival.active}
            backImage={card.mediumBackImage ?? card.backImage}
            artwork={artwork}
            rarity={card.rarity}
          >
            {copy}
          </ReplitPullArrival>
        ) : (
          <Box>
            <RarityArtworkSurface rarity={card.rarity}>
              {artwork}
            </RarityArtworkSurface>
            {copy}
          </Box>
        )}
      </Pressable>
    );
  },
);
DiscoveryCard.displayName = 'DiscoveryCard';
