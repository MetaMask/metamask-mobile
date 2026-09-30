import React, { useId, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
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
import { ShimmerBand } from '../../../Shimmer';
import { PackRevealSelectorsIDs } from './PackReveal.testIds';
import type { PackRevealProps } from './PackReveal.types';
import { usePackRevealAnimation } from './usePackRevealAnimation';
import { RevealBurst, RevealSpark, SealSpark } from './PackReveal.effects';

const AnimatedBox = Animated.createAnimatedComponent(Box);
const GLARE = [
  `${brandColor.white}00`,
  `${brandColor.white}70`,
  `${brandColor.white}00`,
];
// All pack exports use the same 1024×2048 silhouette and upper welded seam.
const SEAL_Y = 0.12;
const SIDE_INSET = 0.07;

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
  const tw = useTailwind();
  const id = useId();
  const window = useWindowDimensions();
  const [size, setSize] = useState({
    width: window.width,
    height: window.height * 0.75,
  });
  const packWidth = Math.min(size.width * 1.13, size.height * 0.76);
  const packHeight = packWidth * 2;
  const packTop = size.height * 0.04;
  const sealY = packHeight * SEAL_Y;
  const sealSceneY = packTop + sealY;
  const sealWidth = packWidth * (1 - 2 * SIDE_INSET);
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
    sealWidth,
  });
  const isSealed = phase === 'sealed';
  const isRevealed = phase === 'revealed';

  const floatingStyle = useAnimatedStyle(() => {
    const charge = Math.sin(Math.min(1, progress.value / 0.1) * Math.PI);
    const shake = Math.sin(progress.value * Math.PI * 90) * charge;
    return {
      transform: [
        { translateY: Math.sin(idle.value * Math.PI * 2) * 5 - charge * 4 },
        { translateX: shake * 2.2 },
        { rotate: `${shake * 0.45}deg` },
        { scale: 1 + charge * 0.018 },
      ],
    };
  });
  const stripStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.1, 0.18, 0.26],
      [1, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.1, 0.14, 0.24],
          [0, -size.height * 0.06, -size.height * 0.58],
          Extrapolation.CLAMP,
        ),
      },
      {
        translateX: interpolate(
          progress.value,
          [0.1, 0.24],
          [0, size.width * 0.38],
          Extrapolation.CLAMP,
        ),
      },
      {
        rotate: `${interpolate(progress.value, [0.1, 0.24], [0, -42], Extrapolation.CLAMP)}deg`,
      },
    ],
  }));
  const bodyStyle = useAnimatedStyle(() => {
    const descent = interpolate(
      progress.value,
      [0.1, 0.6],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: interpolate(
        progress.value,
        [0.1, 0.22, 0.46, 0.64],
        [1, 0.98, 0.6, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        // A gentle continuous acceleration lets the card leave the pouch in one motion.
        {
          translateY:
            size.height * 0.9 * (0.35 * descent + 0.65 * descent * descent),
        },
        { scale: 1 - descent * 0.18 },
        { rotate: `${descent * 7}deg` },
      ],
    };
  });
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.26, 0.36, 0.64],
      [0, 0.32, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.26, 0.68, 1],
          [size.height * 0.25, -6, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.07, 0.18, 0.42, 0.68, 1],
      [0, 0, 1, 1, 0.6, 0.32],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0.08, 0.18, 0.56],
          [0.35, 1, 1.2],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const cutStyle = useAnimatedStyle(() => ({ width: cut.value * sealWidth }));
  const guideStyle = useAnimatedStyle(() => ({
    opacity:
      cut.value > 0 ? 0 : Math.sin(Math.min(1, idle.value / 0.65) * Math.PI),
    transform: [{ translateX: Math.min(1, idle.value / 0.65) * sealWidth }],
  }));
  const cutTipStyle = useAnimatedStyle(() => ({
    opacity: cut.value > 0 ? 1 : 0,
    transform: [{ translateX: cut.value * sealWidth }],
  }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: 0.3,
    transform: [
      { translateX: -packWidth * 0.7 + idle.value * packWidth * 2 },
      { skewX: '-18deg' },
    ],
  }));

  return (
    <Box
      twClassName="flex-1 overflow-hidden"
      onLayout={({ nativeEvent: { layout } }) =>
        setSize({ width: layout.width, height: layout.height })
      }
      testID={PackRevealSelectorsIDs.CONTAINER}
    >
      <Box
        twClassName="absolute inset-0"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 400 700"
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient id={`${id}-ambient`}>
              <Stop
                offset="0"
                stopColor={brandColor.grey200}
                stopOpacity="0.3"
              />
              <Stop offset="1" stopColor={brandColor.grey200} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx="200"
            cy="280"
            rx="270"
            ry="280"
            fill={`url(#${id}-ambient)`}
          />
        </Svg>
        <AnimatedBox twClassName="absolute inset-0" style={glowStyle}>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 700"
            preserveAspectRatio="none"
          >
            <Defs>
              <RadialGradient id={`${id}-rarity`}>
                <Stop
                  offset="0"
                  stopColor={brandColor.white}
                  stopOpacity="0.8"
                />
                <Stop
                  offset="0.24"
                  stopColor={profile.color}
                  stopOpacity="0.6"
                />
                <Stop offset="1" stopColor={profile.color} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx="200"
              cy="350"
              rx="280"
              ry="292"
              fill={`url(#${id}-rarity)`}
            />
          </Svg>
        </AnimatedBox>
        {!reduceMotion && (
          <RevealBurst
            color={profile.color}
            progress={progress}
            originY={sealSceneY}
            width={size.width}
            height={size.height}
          />
        )}
        {!reduceMotion &&
          Array.from({ length: profile.particles }, (_, index) => (
            <RevealSpark
              key={index}
              index={index}
              color={profile.color}
              progress={progress}
              idle={idle}
              width={size.width}
              height={size.height}
              originY={sealSceneY}
              isOpening={!isSealed}
            />
          ))}
      </Box>

      <AnimatedBox
        twClassName="absolute inset-0"
        style={cardStyle}
        pointerEvents={isRevealed ? 'auto' : 'none'}
        accessibilityElementsHidden={!isRevealed}
        importantForAccessibility={isRevealed ? 'auto' : 'no-hide-descendants'}
        testID={PackRevealSelectorsIDs.CARD}
      >
        {children}
      </AnimatedBox>

      {!isRevealed && (
        <AnimatedBox
          twClassName="absolute"
          style={[
            {
              width: packWidth,
              height: packHeight,
              left: (size.width - packWidth) / 2,
              top: packTop,
            },
            floatingStyle,
          ]}
          pointerEvents={isSealed ? 'auto' : 'none'}
          testID={PackRevealSelectorsIDs.PACK}
        >
          <AnimatedBox
            twClassName="absolute left-0 top-0 w-full overflow-hidden"
            style={[{ height: sealY }, stripStyle]}
          >
            <Image
              source={packImage}
              style={{ width: packWidth, height: packHeight }}
              contentFit="fill"
              cachePolicy="memory-disk"
              transition={0}
              accessible={false}
            />
          </AnimatedBox>
          <AnimatedBox
            twClassName="absolute left-0 w-full overflow-hidden"
            style={[{ top: sealY, height: packHeight - sealY }, bodyStyle]}
            testID={PackRevealSelectorsIDs.BODY}
          >
            <Image
              source={packImage}
              style={{ width: packWidth, height: packHeight, top: -sealY }}
              contentFit="fill"
              cachePolicy="memory-disk"
              transition={0}
              accessible={false}
            />
            {isSealed && (
              <Box
                twClassName="absolute top-0 bottom-0 overflow-hidden"
                style={{
                  left: packWidth * SIDE_INSET,
                  right: packWidth * SIDE_INSET,
                }}
                pointerEvents="none"
              >
                <ShimmerBand
                  bandWidth={packWidth * 0.3}
                  animatedStyle={shineStyle}
                  colors={GLARE}
                />
              </Box>
            )}
          </AnimatedBox>
          {isSealed && (
            <GestureDetector gesture={cutGesture}>
              <Box
                collapsable={false}
                twClassName="absolute justify-center"
                style={{
                  left: packWidth * SIDE_INSET,
                  top: sealY - 44,
                  width: sealWidth,
                  height: 88,
                }}
              >
                <Box
                  twClassName="h-2 w-full rounded-full"
                  style={{ backgroundColor: `${brandColor.grey900}80` }}
                />
                <AnimatedBox
                  twClassName="absolute left-0 h-5 rounded-full"
                  style={[
                    {
                      backgroundColor: `${brandColor.blue300}55`,
                      shadowColor: brandColor.blue300,
                      shadowOpacity: 1,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 0 },
                    },
                    cutStyle,
                  ]}
                  pointerEvents="none"
                />
                <AnimatedBox
                  twClassName="absolute left-0 rounded-full"
                  style={[
                    {
                      height: 5,
                      backgroundColor: brandColor.white,
                      borderWidth: 0.5,
                      borderColor: brandColor.blue200,
                      shadowColor: brandColor.blue300,
                      shadowOpacity: 1,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 0 },
                    },
                    cutStyle,
                  ]}
                  testID={PackRevealSelectorsIDs.CUT_PROGRESS}
                />
                <AnimatedBox
                  twClassName="absolute"
                  style={[{ left: -84, top: 8 }, guideStyle]}
                  pointerEvents="none"
                >
                  <SealSpark />
                </AnimatedBox>
                <AnimatedBox
                  twClassName="absolute"
                  style={[{ left: -84, top: 8 }, cutTipStyle]}
                  pointerEvents="none"
                >
                  <SealSpark />
                </AnimatedBox>
              </Box>
            </GestureDetector>
          )}
        </AnimatedBox>
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
            originY={sealSceneY}
            width={size.width}
            height={size.height}
          />
        </Box>
      )}
      {isSealed && (
        <Box
          twClassName="absolute top-0 left-0 right-0 items-center px-6 pt-2"
          pointerEvents="none"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            style={{
              color: brandColor.grey050,
              textAlign: 'center',
              textShadowColor: brandColor.grey1000,
              textShadowRadius: 6,
              textShadowOffset: { width: 0, height: 1 },
            }}
          >
            {strings(
              isReady ? 'gacha.reveal.cut_hint' : 'gacha.reveal.preparing_card',
            )}
          </Text>
        </Box>
      )}
      {isSealed && (
        <Box twClassName="absolute bottom-0 left-0 right-0 items-center px-6 pb-5 pt-10">
          <LinearGradient
            colors={[`${brandColor.grey1000}00`, brandColor.grey1000]}
            style={tw.style('absolute inset-0')}
            pointerEvents="none"
          />
          <ButtonBase
            onPress={reveal}
            isDisabled={!enabled || !isReady}
            isLoading={!isReady}
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
      )}
    </Box>
  );
};

export default PackReveal;
