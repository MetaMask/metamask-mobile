import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { ImageLoadEventData } from 'expo-image';
import Animated from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Box } from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { ShimmerBand } from '../../../Shimmer';
import { GachaInteractiveCardTestIds } from '../../Gacha.testIds';
import CardImage, { CARD_ASPECT_RATIO } from '../CardImage';
import type { InteractiveCardProps } from './InteractiveCard.types';
import { CARD_EDGE_WIDTH, useCardAnimation } from './useCardAnimation';

const AnimatedBox = Animated.createAnimatedComponent(Box);
const GLARE_COLORS = [
  `${brandColor.white}00`,
  brandColor.white,
  `${brandColor.white}00`,
];
const EDGE_COLORS = [
  brandColor.grey500,
  brandColor.grey100,
  brandColor.grey600,
];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 0 };
const EDGE_SIZE = { width: CARD_EDGE_WIDTH };

/** Provider-independent card viewer with two photographed faces and a thin slab edge. */
const InteractiveCard = ({
  name,
  frontImage,
  backImage,
  frontPreviewImage,
  backPreviewImage,
  isActive = true,
  revealProgress,
  onImageReady,
}: InteractiveCardProps) => {
  const tw = useTailwind();
  const [width, setWidth] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(CARD_ASPECT_RATIO);
  const [frontReady, setFrontReady] = useState<string>();
  const [backReady, setBackReady] = useState<string>();
  const frontKey = frontImage ?? frontPreviewImage;
  const backKey = backImage ?? backPreviewImage;
  const isFrontReady = Boolean(frontKey && frontReady === frontKey);
  const isBackReady = Boolean(backKey && backReady === backKey);
  const canFlip = isFrontReady && isBackReady;
  const {
    isFlipped,
    flipCard,
    panGesture,
    floatingStyle,
    frontStyle,
    backStyle,
    edgeStyle,
    glareStyle,
  } = useCardAnimation({
    isActive: isActive && isFrontReady,
    canFlip,
    width,
    resetKey: JSON.stringify([frontKey, backKey]),
    revealProgress,
  });

  useEffect(() => setAspectRatio(CARD_ASPECT_RATIO), [frontKey]);

  const handleFrontLoad = useCallback(
    ({ source }: ImageLoadEventData) => {
      setFrontReady(frontKey);
      onImageReady?.();
      if (!isFrontReady && source.width > 0 && source.height > 0) {
        setAspectRatio(source.width / source.height);
      }
    },
    [frontKey, isFrontReady, onImageReady],
  );
  const handleBackLoad = useCallback(() => setBackReady(backKey), [backKey]);
  const handleFrontError = useCallback(() => {
    setFrontReady(undefined);
    onImageReady?.();
  }, [onImageReady]);
  const handleBackError = useCallback(() => {
    setBackReady(undefined);
  }, []);
  const showBack = isFlipped && canFlip;

  return (
    <GestureDetector gesture={panGesture}>
      <Pressable
        style={tw.style('w-full', { aspectRatio })}
        onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
        onPress={flipCard}
        disabled={!canFlip || !isActive}
        accessible
        accessibilityRole={canFlip ? 'button' : 'image'}
        accessibilityLabel={strings(
          showBack ? 'gacha.card.back_label' : 'gacha.card.front_label',
          { name },
        )}
        accessibilityHint={
          canFlip ? strings('gacha.card.drag_hint') : undefined
        }
        testID={GachaInteractiveCardTestIds.CONTAINER}
      >
        <AnimatedBox
          twClassName="h-full w-full"
          style={floatingStyle}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <AnimatedBox
            twClassName="absolute inset-0 overflow-hidden rounded-xl"
            style={frontStyle}
          >
            <CardImage
              uri={frontImage}
              previewUri={frontPreviewImage}
              aspectRatio={aspectRatio}
              transparent
              onLoad={handleFrontLoad}
              onError={handleFrontError}
              testID={GachaInteractiveCardTestIds.FRONT}
            />
            {isFrontReady && width > 0 && (
              <ShimmerBand
                bandWidth={width * 0.55}
                animatedStyle={glareStyle}
                colors={GLARE_COLORS}
              />
            )}
          </AnimatedBox>
          {backKey && (
            <AnimatedBox
              twClassName="absolute inset-0 overflow-hidden rounded-xl"
              style={backStyle}
            >
              <CardImage
                uri={backImage}
                previewUri={backPreviewImage}
                aspectRatio={aspectRatio}
                transparent
                onLoad={handleBackLoad}
                onError={handleBackError}
                testID={GachaInteractiveCardTestIds.BACK}
              />
              {isBackReady && width > 0 && (
                <ShimmerBand
                  bandWidth={width * 0.55}
                  animatedStyle={glareStyle}
                  colors={GLARE_COLORS}
                />
              )}
            </AnimatedBox>
          )}
          <AnimatedBox
            twClassName="absolute left-0 top-0 bottom-0 z-10 overflow-hidden rounded-sm"
            style={[EDGE_SIZE, edgeStyle]}
            testID={GachaInteractiveCardTestIds.EDGE}
          >
            <LinearGradient
              colors={EDGE_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={tw.style('flex-1')}
            />
          </AnimatedBox>
        </AnimatedBox>
      </Pressable>
    </GestureDetector>
  );
};

export default InteractiveCard;
