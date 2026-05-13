import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import CardImage from '../../../components/CardImage';
import { CardType } from '../../../types';
import { CardStatus } from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { CardHomeSelectors } from '../CardHome.testIds';

interface FlippableCardProps {
  isLoading: boolean;
  cardDetailsImageUrl: string | null;
  isCardDetailsImageLoading: boolean;
  onImageLoad: () => void;
  onImageError: () => void;
  cardType: CardType | undefined;
  cardStatus: CardStatus | undefined;
  walletAddress: string | undefined;
}

const FLIP_DURATION_MS = 700;
const CARD_ASPECT_RATIO = 851 / 540;

const faceStyles = StyleSheet.create({
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
});

const FlippableCard = ({
  isLoading,
  cardDetailsImageUrl,
  isCardDetailsImageLoading,
  onImageLoad,
  onImageError,
  cardType,
  cardStatus,
  walletAddress,
}: FlippableCardProps) => {
  const tw = useTailwind();
  const reducedMotion = useReducedMotion();

  // 0 = front (card art), 1 = back (card details image)
  const flip = useSharedValue(0);

  // Keep the last-rendered back-face URL mounted through the reverse flip so
  // the image doesn't disappear before/while the card animates back to front.
  const [stickyBackUrl, setStickyBackUrl] = useState<string | null>(null);
  const clearBackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (cardDetailsImageUrl) {
      if (clearBackTimeoutRef.current) {
        clearTimeout(clearBackTimeoutRef.current);
        clearBackTimeoutRef.current = null;
      }
      setStickyBackUrl(cardDetailsImageUrl);
    } else if (stickyBackUrl) {
      clearBackTimeoutRef.current = setTimeout(() => {
        setStickyBackUrl(null);
        clearBackTimeoutRef.current = null;
      }, FLIP_DURATION_MS);
    }
    return () => {
      if (clearBackTimeoutRef.current) {
        clearTimeout(clearBackTimeoutRef.current);
        clearBackTimeoutRef.current = null;
      }
    };
  }, [cardDetailsImageUrl, stickyBackUrl]);

  const shouldShowBack = !!cardDetailsImageUrl && !isCardDetailsImageLoading;

  useEffect(() => {
    const target = shouldShowBack ? 1 : 0;
    if (reducedMotion) {
      flip.value = target;
    } else {
      flip.value = withTiming(target, {
        duration: FLIP_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
      });
    }
  }, [shouldShowBack, reducedMotion, flip]);

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
    };
  });

  if (isLoading) {
    return (
      <Box
        twClassName="w-full rounded-xl overflow-hidden"
        style={{ aspectRatio: CARD_ASPECT_RATIO }}
      >
        <Skeleton
          height={'100%'}
          width={'100%'}
          style={tw.style('rounded-xl')}
        />
      </Box>
    );
  }

  return (
    <Box twClassName="w-full" style={{ aspectRatio: CARD_ASPECT_RATIO }}>
      <Animated.View style={[faceStyles.face, frontStyle]}>
        <CardImage
          type={cardType ?? CardType.VIRTUAL}
          status={cardStatus ?? CardStatus.ACTIVE}
          address={walletAddress}
          testID={
            walletAddress ? CardHomeSelectors.CARD_WALLET_ADDRESS : undefined
          }
        />
      </Animated.View>

      <Animated.View style={[faceStyles.face, backStyle]}>
        <Box
          twClassName="w-full h-full rounded-xl overflow-hidden"
          style={{ aspectRatio: CARD_ASPECT_RATIO }}
        >
          {stickyBackUrl ? (
            <Image
              source={{ uri: stickyBackUrl }}
              style={tw.style('w-full h-full')}
              resizeMode="cover"
              onLoad={onImageLoad}
              onError={onImageError}
              testID={CardHomeSelectors.CARD_DETAILS_IMAGE}
            />
          ) : null}
        </Box>
      </Animated.View>
    </Box>
  );
};

export default FlippableCard;
