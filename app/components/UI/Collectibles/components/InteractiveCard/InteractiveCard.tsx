import React, { useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { CollectiblesInteractiveCardTestIds } from '../../Collectibles.testIds';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import CardImage from '../CardImage';
import CollectiblesMotion from '../CollectiblesMotion/CollectiblesMotion';
import type { InteractiveCardProps } from './InteractiveCard.types';

/** Replit's original slab, drag, flip, zoom and orbit, rendered by the bundled web scene. */
export default function InteractiveCard({
  name,
  frontImage,
  backImage,
  frontPreviewImage,
  backPreviewImage,
  isActive = true,
  onImageReady,
  presentation = 'detail',
  soldLabel,
}: InteractiveCardProps) {
  const [failed, setFailed] = useState(false);
  const { online, network } = useCollectiblesPresentation();
  const front =
    network === 'SLOW_CELLULAR'
      ? (frontPreviewImage ?? frontImage)
      : (frontImage ?? frontPreviewImage);
  const back =
    network === 'SLOW_CELLULAR'
      ? (backPreviewImage ?? backImage)
      : (backImage ?? backPreviewImage);
  return (
    <Box
      twClassName="w-full"
      style={{ aspectRatio: 5 / 8 }}
      testID={CollectiblesInteractiveCardTestIds.CONTAINER}
    >
      {!online || failed || !front ? (
        <CardImage
          uri={online ? front : undefined}
          accessibilityLabel={name}
          onLoad={onImageReady}
          onError={onImageReady}
          transparent
        />
      ) : (
        <CollectiblesMotion
          key={`${front}:${back ?? ''}`}
          configuration={{
            kind: 'card',
            identity: front,
            name,
            front,
            back,
            presentation,
            soldLabel,
          }}
          isActive={isActive}
          onImageReady={onImageReady}
          onError={() => {
            setFailed(true);
            onImageReady?.();
          }}
          testID="collectibles-interactive-card-web"
        />
      )}
    </Box>
  );
}
