import React from 'react';
import type { ImageSourcePropType, ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { brandColor } from '@metamask/design-tokens';
import { ShimmerBand } from '../../../Shimmer';
import { PackRevealSelectorsIDs } from './PackReveal.testIds';
import { SealSpark } from './PackReveal.effects';
import { glowStyle, toAlphaHex } from './PackReveal.glow';
import type { usePackRevealAnimation } from './usePackRevealAnimation';

const AnimatedBox = Animated.createAnimatedComponent(Box);
const GLARE = [
  `${brandColor.white}00`,
  `${brandColor.white}70`,
  `${brandColor.white}00`,
];
// All pack exports use the same 1024×2048 silhouette and upper welded seam.
const SEAL_Y = 0.12;
const SIDE_INSET = 0.07;
// The trail stays translucent; iOS dims its pixel-based shadow by the same alpha.
const CUT_TRAIL_ALPHA = 0x55 / 255;
const CUT_TRAIL_STYLE: ViewStyle = {
  backgroundColor: `${brandColor.blue300}${toAlphaHex(CUT_TRAIL_ALPHA)}`,
  ...glowStyle({
    color: brandColor.blue300,
    radius: 16,
    opacity: 1,
    fillAlpha: CUT_TRAIL_ALPHA,
  }),
};
const CUT_CORE_STYLE: ViewStyle = {
  height: 5,
  backgroundColor: brandColor.white,
  borderWidth: 0.5,
  borderColor: brandColor.blue200,
  ...glowStyle({ color: brandColor.blue300, radius: 10, opacity: 1 }),
};

type CutGesture = ReturnType<typeof usePackRevealAnimation>['cutGesture'];

export interface SceneSize {
  width: number;
  height: number;
}

export interface PackLayout {
  /** Pack width in points. */
  packWidth: number;
  /** Pack height in points, twice its width. */
  packHeight: number;
  /** Distance from the scene top to the pack top. */
  packTop: number;
  /** Seal position inside the pack. */
  sealY: number;
  /** Seal position inside the scene. */
  sealSceneY: number;
  /** Cuttable seal width, between the welded side edges. */
  sealWidth: number;
}

/**
 * Fits the pack to the scene and locates its welded seal.
 *
 * @param size - Scene size in points.
 * @returns The pack and seal geometry in points.
 */
export const getPackLayout = ({ width, height }: SceneSize): PackLayout => {
  const packWidth = Math.min(width * 1.13, height * 0.76);
  const packHeight = packWidth * 2;
  const packTop = height * 0.04;
  const sealY = packHeight * SEAL_Y;
  return {
    packWidth,
    packHeight,
    packTop,
    sealY,
    sealSceneY: packTop + sealY,
    sealWidth: packWidth * (1 - 2 * SIDE_INSET),
  };
};

interface CutSeamProps {
  cutGesture: CutGesture;
  cut: SharedValue<number>;
  idle: SharedValue<number>;
  packWidth: number;
  sealY: number;
  sealWidth: number;
}

/** Touch area along the seal, with the cut trail, its moving light and the idle guide. */
const CutSeam = ({
  cutGesture,
  cut,
  idle,
  packWidth,
  sealY,
  sealWidth,
}: CutSeamProps) => {
  const tw = useTailwind();
  const cutStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (-(1 - cut.value) * sealWidth) / 2 },
      { scaleX: cut.value },
    ],
  }));
  const guideStyle = useAnimatedStyle(() => ({
    opacity:
      cut.value > 0 ? 0 : Math.sin(Math.min(1, idle.value / 0.65) * Math.PI),
    transform: [{ translateX: Math.min(1, idle.value / 0.65) * sealWidth }],
  }));
  const cutTipStyle = useAnimatedStyle(() => ({
    opacity: cut.value > 0 ? 1 : 0,
    transform: [{ translateX: cut.value * sealWidth }],
  }));

  return (
    <GestureDetector gesture={cutGesture}>
      <Box
        collapsable={false}
        twClassName="absolute justify-center"
        style={tw.style('h-22', {
          left: packWidth * SIDE_INSET,
          top: sealY - 44,
          width: sealWidth,
        })}
      >
        <Box
          twClassName="h-2 w-full rounded-full"
          style={{ backgroundColor: `${brandColor.grey900}80` }}
        />
        <AnimatedBox
          twClassName="absolute left-0 h-5 rounded-full"
          style={[CUT_TRAIL_STYLE, { width: sealWidth }, cutStyle]}
          pointerEvents="none"
        />
        <AnimatedBox
          twClassName="absolute left-0 rounded-full"
          style={[CUT_CORE_STYLE, { width: sealWidth }, cutStyle]}
          testID={PackRevealSelectorsIDs.CUT_PROGRESS}
        />
        <AnimatedBox
          twClassName="absolute"
          style={[tw.style('-left-[84px] top-2'), guideStyle]}
          pointerEvents="none"
        >
          <SealSpark />
        </AnimatedBox>
        <AnimatedBox
          twClassName="absolute"
          style={[tw.style('-left-[84px] top-2'), cutTipStyle]}
          pointerEvents="none"
        >
          <SealSpark />
        </AnimatedBox>
      </Box>
    </GestureDetector>
  );
};

export interface SealedPackProps {
  packImage: ImageSourcePropType;
  layout: PackLayout;
  size: SceneSize;
  progress: SharedValue<number>;
  cut: SharedValue<number>;
  idle: SharedValue<number>;
  cutGesture: CutGesture;
  isSealed: boolean;
  reduceMotion: boolean;
}

/**
 * Floating pouch, clipped from one image into a detaching strip and a descending body.
 * The seal is cuttable only while sealed.
 */
export const SealedPack = ({
  packImage,
  layout: { packWidth, packHeight, packTop, sealY, sealWidth },
  size,
  progress,
  cut,
  idle,
  cutGesture,
  isSealed,
  reduceMotion,
}: SealedPackProps) => {
  const tw = useTailwind();
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
  const shineStyle = useAnimatedStyle(() => ({
    opacity: 0.3,
    transform: [
      { translateX: -packWidth * 0.7 + idle.value * packWidth * 2 },
      { skewX: '-18deg' },
    ],
  }));
  const seamChargeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.02, 0.08, 0.11],
      [0, 0.6, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 0.1],
          [packHeight * 0.45, -packHeight * 0.12],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
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
        {!isSealed && !reduceMotion && (
          <AnimatedBox
            twClassName="absolute top-0"
            style={[
              {
                left: packWidth * SIDE_INSET,
                right: packWidth * SIDE_INSET,
                height: packHeight * 0.24,
              },
              seamChargeStyle,
            ]}
            pointerEvents="none"
          >
            <LinearGradient colors={GLARE} style={tw.style('flex-1')} />
          </AnimatedBox>
        )}
      </AnimatedBox>
      {isSealed && (
        <CutSeam
          cutGesture={cutGesture}
          cut={cut}
          idle={idle}
          packWidth={packWidth}
          sealY={sealY}
          sealWidth={sealWidth}
        />
      )}
    </AnimatedBox>
  );
};
