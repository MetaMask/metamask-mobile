import React, { useId } from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { Box } from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';
import { RevealBurst, RevealSpark } from './PackReveal.effects';

const AnimatedBox = Animated.createAnimatedComponent(Box);

export interface PackBackdropProps {
  /** Light color of the result's rarity. */
  color: string;
  /** Number of sparks emitted by the rarity profile. */
  particles: number;
  /** Shared reveal clock, from 0 to 1. */
  progress: SharedValue<number>;
  /** Idle loop clock, from 0 to 1. */
  idle: SharedValue<number>;
  /** Scene width in points. */
  width: number;
  /** Scene height in points. */
  height: number;
  /** Vertical position of the seal in the scene, in points. */
  originY: number;
  /** Sparks take the rarity color once the seal is cut. */
  isOpening: boolean;
  /** Hides the burst and sparks for reduced-motion users. */
  reduceMotion: boolean;
}

/**
 * Decorative light behind the pack: ambient gradient, rarity glow, rear burst and sparks.
 * It is hidden from assistive technology and never receives touches.
 */
export const PackBackdrop = ({
  color,
  particles,
  progress,
  idle,
  width,
  height,
  originY,
  isOpening,
  reduceMotion,
}: PackBackdropProps) => {
  const id = useId();
  const rarityGlowStyle = useAnimatedStyle(() => ({
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

  return (
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
            <Stop offset="0" stopColor={brandColor.grey200} stopOpacity="0.3" />
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
      <AnimatedBox twClassName="absolute inset-0" style={rarityGlowStyle}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 400 700"
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient id={`${id}-rarity`}>
              <Stop offset="0" stopColor={color} stopOpacity="0.8" />
              <Stop offset="0.24" stopColor={color} stopOpacity="0.6" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
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
          color={color}
          progress={progress}
          originY={originY}
          width={width}
          height={height}
        />
      )}
      {!reduceMotion &&
        Array.from({ length: particles }, (_, index) => (
          <RevealSpark
            key={index}
            index={index}
            color={color}
            progress={progress}
            idle={idle}
            width={width}
            height={height}
            originY={originY}
            isOpening={isOpening}
          />
        ))}
    </Box>
  );
};
