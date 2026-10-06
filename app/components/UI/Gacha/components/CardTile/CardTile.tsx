import React, { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import { Image } from 'expo-image';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  Card,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { colorWithOpacity } from '../../../../../util/colors';
import { useTheme } from '../../../../../util/theme';
import { GachaCardTileTestIds } from '../../Gacha.testIds';
import type { CollectorCryptCard } from '../../providers/collector-crypt/types';
import { getCardValue } from '../../providers/collector-crypt/utils/cards';
import { formatUsd } from '../../providers/collector-crypt/utils/format';
import CardImage, { CARD_ASPECT_RATIO } from '../CardImage';

export interface CardTileProps {
  card: CollectorCryptCard;
  onPress: (mint: string) => void;
  testID?: string;
}

/** Shared collection/home tile with a subtle floor reflection and card value. */
const CardTile = ({ card, onPress, testID }: CardTileProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [failedMediumImage, setFailedMediumImage] = useState<string>();
  const image =
    card.mediumImage && failedMediumImage !== card.mediumImage
      ? card.mediumImage
      : card.image;
  const value = getCardValue(card);
  const [loadedImage, setLoadedImage] = useState<string>();
  const handlePress = useCallback(
    () => onPress(card.mint),
    [onPress, card.mint],
  );
  const handleLoad = useCallback(() => setLoadedImage(image), [image]);
  const handleError = useCallback(
    () => setFailedMediumImage(card.mediumImage),
    [card.mediumImage],
  );
  const showReflection = Boolean(image && loadedImage === image);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={card.name}
      testID={testID ?? GachaCardTileTestIds.TILE(card.mint)}
      style={({ pressed }) => tw.style('w-full', pressed && 'opacity-70')}
    >
      <Card twClassName="aspect-square w-full overflow-hidden border border-muted bg-muted p-0">
        <Box twClassName="absolute left-[23%] top-[14%] w-[54%]">
          <CardImage
            uri={image}
            accessibilityLabel={card.name}
            transparent
            roundedClassName="rounded-none"
            onLoad={handleLoad}
            onError={handleError}
          />
        </Box>
        {showReflection && (
          <Box
            twClassName="absolute inset-0"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID={GachaCardTileTestIds.REFLECTION(card.mint)}
          >
            <Image
              source={image}
              style={tw.style(
                'absolute left-[23%] top-[91%] w-[54%] opacity-30',
                {
                  aspectRatio: CARD_ASPECT_RATIO,
                  transform: [{ scaleY: -1 }],
                },
              )}
              contentFit="contain"
              cachePolicy="memory-disk"
              accessible={false}
            />
            <LinearGradient
              colors={[
                colorWithOpacity(colors.background.muted, 0),
                colors.background.muted,
              ]}
              style={tw.style('absolute bottom-0 h-[9%] w-full')}
            />
          </Box>
        )}
      </Card>
      <Box gap={1} marginTop={2} accessible={false}>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          testID={GachaCardTileTestIds.NAME(card.mint)}
        >
          {card.name}
        </Text>
        {value !== undefined && (
          // A USD valuation, not a USDC amount the user can receive.
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            testID={GachaCardTileTestIds.VALUE(card.mint)}
          >
            {formatUsd(value)}
          </Text>
        )}
        {card.sale?.status === 'pending' && (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            testID={GachaCardTileTestIds.SELLING_TAG(card.mint)}
          >
            {strings('gacha.cards.selling_tag')}
          </Text>
        )}
      </Box>
    </Pressable>
  );
};

export default CardTile;
