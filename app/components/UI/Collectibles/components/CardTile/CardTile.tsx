import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import {
  Box,
  Card,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getCardTitle } from '../CardDisplay/cardLabels';
import RarityArtworkSurface from '../CardDisplay/RarityArtworkSurface';
import CardSummary from '../CardDisplay/CardSummary';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesCardTileTestIds } from '../../Collectibles.testIds';
import type { CollectiblesCard } from '../../types';
import { getCardValue } from '../../providers/pack-partner/utils/cards';
import CardImage from '../CardImage';
import { useCollectionTransfer } from '../CollectionTransfer/CollectionTransferProvider';

export interface CardTileProps {
  card: CollectiblesCard;
  onPress: (mint: string) => void;
  testID?: string;
  compact?: boolean;
  isCollectionTransferTarget?: boolean;
  /** My Collection may format its insured value in the selected display currency. */
  formattedValue?: string;
}

/** Replit's CollectionCard composition, shared with the wallet's collection preview. */
const CardTile = ({
  card,
  onPress,
  testID,
  compact = false,
  isCollectionTransferTarget = false,
  formattedValue,
}: CardTileProps) => {
  const tw = useTailwind();
  const artwork = useRef<View>(null);
  const { registerTarget, pendingMints } = useCollectionTransfer();
  const hidden = isCollectionTransferTarget && pendingMints.includes(card.mint);
  const opacity = useRef(new Animated.Value(1)).current;
  const wasHidden = useRef(false);
  useEffect(() => {
    if (!isCollectionTransferTarget) return;
    return registerTarget(card.mint, (receive) =>
      artwork.current?.measureInWindow((left, top, width, height) =>
        receive({ left, top, width, height }),
      ),
    );
  }, [card.mint, isCollectionTransferTarget, registerTarget]);
  useEffect(() => {
    opacity.stopAnimation();
    if (hidden) opacity.setValue(0);
    else if (wasHidden.current) {
      // Replit CollectionTransfer.tsx restores the target with this 180ms arrival fade.
      opacity.setValue(0.75);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
    wasHidden.current = hidden;
    return () => opacity.stopAnimation();
  }, [hidden, opacity]);
  const [failedMediumImage, setFailedMediumImage] = useState<string>();
  const image =
    card.mediumImage && failedMediumImage !== card.mediumImage
      ? card.mediumImage
      : card.image;
  return (
    <Card
      isInteractive
      onPress={() => onPress(card.mint)}
      accessibilityRole="button"
      accessibilityLabel={getCardTitle(card)}
      testID={testID ?? CollectiblesCardTileTestIds.TILE(card.mint)}
      style={({ pressed }) =>
        tw.style(
          'w-full bg-transparent border-0 rounded-none p-0',
          pressed && 'opacity-70',
        )
      }
    >
      <RarityArtworkSurface rarity={card.rarity}>
        <Animated.View
          ref={artwork}
          collapsable={false}
          style={tw.style(
            'w-full overflow-hidden',
            compact ? 'h-40' : { aspectRatio: 2 / 3 },
            { opacity },
          )}
          testID={CollectiblesCardTileTestIds.ARTWORK(card.mint)}
        >
          <Box
            twClassName="w-full self-center"
            style={compact ? { maxWidth: (160 * 2) / 3 } : undefined}
          >
            <CardImage
              uri={image}
              accessibilityLabel={getCardTitle(card)}
              aspectRatio={2 / 3}
              transparent
              roundedClassName="rounded-none"
              onError={() => setFailedMediumImage(card.mediumImage)}
            />
          </Box>
          {card.sale?.status === 'pending' && (
            <Box twClassName="absolute top-1 right-1 max-w-full rounded bg-default/90 px-2 py-1">
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
                numberOfLines={1}
                testID={CollectiblesCardTileTestIds.SELLING_TAG(card.mint)}
              >
                {strings('collectibles.cards.selling_tag')}
              </Text>
            </Box>
          )}
        </Animated.View>
      </RarityArtworkSurface>
      <CardSummary
        card={card}
        value={getCardValue(card)}
        formattedValue={formattedValue}
        nameTestID={CollectiblesCardTileTestIds.NAME(card.mint)}
        valueTestID={CollectiblesCardTileTestIds.VALUE(card.mint)}
      />
    </Card>
  );
};
export default CardTile;
