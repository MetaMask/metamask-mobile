import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  ButtonBase,
  ButtonBaseSize,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { brandColor } from '@metamask/design-tokens';
import { strings } from '../../../../../../locales/i18n';
import { PackRevealSelectorsIDs } from './PackReveal.testIds';
import type { PackRevealProps } from './PackReveal.types';
import { usePackRevealAnimation } from './usePackRevealAnimation';
import { RevealBurst } from './PackReveal.effects';
import { PackBackdrop } from './PackReveal.backdrop';
import { getPackLayout, SealedPack } from './PackReveal.pack';

const AnimatedBox = Animated.createAnimatedComponent(Box);
const FOOTER_FADE = [`${brandColor.grey1000}00`, brandColor.grey1000];

/** Instruction above the pack while the seal is closed. */
const CutHint = ({ isReady }: { isReady: boolean }) => {
  const tw = useTailwind();
  return (
    <Box
      twClassName="absolute top-0 left-0 right-0 items-center px-6 pt-2"
      pointerEvents="none"
      accessible={false}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        style={tw.style('text-center', {
          color: brandColor.grey050,
          textShadowColor: brandColor.grey1000,
          textShadowRadius: 6,
          textShadowOffset: { width: 0, height: 1 },
        })}
      >
        {strings(
          isReady ? 'gacha.reveal.cut_hint' : 'gacha.reveal.preparing_card',
        )}
      </Text>
    </Box>
  );
};

/** Accessible alternative to the cut gesture, over a fade into the scene background. */
const RevealFooter = ({
  packName,
  onReveal,
  isDisabled,
  isLoading,
}: {
  packName: string;
  onReveal: () => void;
  isDisabled: boolean;
  isLoading: boolean;
}) => {
  const tw = useTailwind();
  return (
    <Box
      twClassName="absolute bottom-0 left-0 right-0 items-center px-6 pb-5 pt-10"
      accessible={false}
    >
      <LinearGradient
        colors={FOOTER_FADE}
        style={tw.style('absolute inset-0')}
        pointerEvents="none"
      />
      <ButtonBase
        onPress={onReveal}
        isDisabled={isDisabled}
        isLoading={isLoading}
        size={ButtonBaseSize.Sm}
        hitSlop={8}
        accessibilityHint={packName}
        testID={PackRevealSelectorsIDs.REVEAL_BUTTON}
        twClassName="mt-2 self-center bg-transparent px-4"
        textProps={{
          variant: TextVariant.BodySm,
          style: { color: brandColor.grey200 },
        }}
      >
        {strings('gacha.reveal.reveal_card')}
      </ButtonBase>
    </Box>
  );
};

/** Tactile presentation only. The purchase is already complete before mounting this scene. */
const PackReveal = ({
  packImage,
  packName,
  rarity,
  isActive = true,
  isReady = true,
  onRevealed,
  children,
}: PackRevealProps) => {
  const windowSize = useWindowDimensions();
  const [size, setSize] = useState({
    width: windowSize.width,
    height: windowSize.height * 0.75,
  });
  const layout = getPackLayout(size);
  const {
    phase,
    profile,
    progress,
    cut,
    idle,
    cutGesture,
    reveal,
    enabled,
    reduceMotion,
  } = usePackRevealAnimation({
    isActive,
    isReady,
    rarity,
    onRevealed,
    sealWidth: layout.sealWidth,
  });
  const isSealed = phase === 'sealed';
  const isRevealed = phase === 'revealed';

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.34, 0.44, 0.68],
      [0, 0.4, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.34, 0.58, 0.86, 1],
          [size.height * 0.28, size.height * 0.06, -4, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Box
      twClassName="flex-1 overflow-hidden"
      onLayout={({ nativeEvent: { layout: sceneLayout } }) =>
        setSize({ width: sceneLayout.width, height: sceneLayout.height })
      }
      testID={PackRevealSelectorsIDs.CONTAINER}
    >
      <PackBackdrop
        color={profile.color}
        particles={profile.particles}
        progress={progress}
        idle={idle}
        width={size.width}
        height={size.height}
        originY={layout.sealSceneY}
        isOpening={!isSealed}
        reduceMotion={reduceMotion}
      />

      <AnimatedBox
        twClassName="absolute inset-0"
        style={cardStyle}
        pointerEvents={isRevealed ? 'auto' : 'none'}
        accessibilityElementsHidden={!isRevealed}
        importantForAccessibility={isRevealed ? 'auto' : 'no-hide-descendants'}
        testID={PackRevealSelectorsIDs.CARD}
      >
        {typeof children === 'function' ? children(progress) : children}
      </AnimatedBox>

      {!isRevealed && (
        <SealedPack
          packImage={packImage}
          layout={layout}
          size={size}
          progress={progress}
          cut={cut}
          idle={idle}
          cutGesture={cutGesture}
          isSealed={isSealed}
          reduceMotion={reduceMotion}
        />
      )}
      {phase === 'opening' && !reduceMotion && (
        <Box
          twClassName="absolute inset-0"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <RevealBurst
            foreground
            color={profile.color}
            progress={progress}
            originY={layout.sealSceneY}
            width={size.width}
            height={size.height}
          />
        </Box>
      )}
      {isSealed && <CutHint isReady={isReady} />}
      {isSealed && (
        <RevealFooter
          packName={packName}
          onReveal={reveal}
          isDisabled={!enabled || !isReady}
          isLoading={!isReady}
        />
      )}
    </Box>
  );
};

export default PackReveal;
