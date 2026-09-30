import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getCollectorCryptPackArtwork } from '../../assets/packs';
import CardDisplay from '../../components/CardDisplay';
import PackReveal from '../../components/PackReveal';
import { GachaRevealTestIds } from '../../Gacha.testIds';
import type { CollectorCryptCard } from '../../providers/collector-crypt/types';

interface GachaRevealContentProps {
  card: CollectorCryptCard;
  packCode: string;
  packName: string;
  isActive: boolean;
  isRevealed: boolean;
  onRevealed: () => void;
  footer: React.ReactNode;
  details?: React.ReactNode;
}

/** The same presentation for paid reveals and the isolated local preview. */
const GachaRevealContent = ({
  card,
  packCode,
  packName,
  isActive,
  isRevealed,
  onRevealed,
  footer,
  details,
}: GachaRevealContentProps) => {
  const tw = useTailwind();
  const artwork = getCollectorCryptPackArtwork(packCode);
  const [height, setHeight] = useState(0);
  const [imageReady, setImageReady] = useState(
    !card.image && !card.mediumImage,
  );
  const handleImageReady = useCallback(() => setImageReady(true), []);

  useEffect(() => {
    // Load originals while the preview and the unopened pack are displayed.
    const originals = [card.image, card.backImage].filter(
      (uri): uri is string => Boolean(uri),
    );
    if (originals.length) {
      Image.prefetch(originals, { cachePolicy: 'memory-disk' }).catch(
        () => undefined,
      );
    }
    // An unavailable image must never trap a purchased card behind an animation.
    const timeout = setTimeout(handleImageReady, 8000);
    return () => clearTimeout(timeout);
  }, [card.image, card.backImage, handleImageReady]);

  return (
    <Box twClassName="flex-1">
      <Box
        twClassName="flex-1"
        onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
      >
        <PackReveal
          packImage={artwork.image}
          packName={packName}
          rarity={card.rarity}
          isActive={isActive}
          isReady={imageReady}
          onRevealed={onRevealed}
        >
          <ScrollView
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style(
              'grow justify-center items-center px-4 pb-3',
            )}
            showsVerticalScrollIndicator={false}
            testID={GachaRevealTestIds.REVEALED}
          >
            <CardDisplay
              card={card}
              variant="reveal"
              isActive={isActive && isRevealed}
              showMetadata={isRevealed}
              imageMaxWidth={
                height
                  ? Math.min(280, Math.max(150, (height - 210) * 0.6))
                  : 240
              }
              onImageReady={handleImageReady}
            />
            {isRevealed && details}
          </ScrollView>
        </PackReveal>
      </Box>
      <Box
        gap={3}
        twClassName="min-h-36 px-4 pb-4 pt-2"
        style={{ opacity: isRevealed ? 1 : 0 }}
        pointerEvents={isRevealed ? 'auto' : 'none'}
        accessibilityElementsHidden={!isRevealed}
        importantForAccessibility={isRevealed ? 'auto' : 'no-hide-descendants'}
      >
        {footer}
      </Box>
    </Box>
  );
};

export default GachaRevealContent;
