import React, { useId } from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { brandColor } from '@metamask/design-tokens';
import { glowStyle } from './PackReveal.glow';

const AnimatedBox = Animated.createAnimatedComponent(Box);

/** Fixed particles emitted in three waves; all positions stay on the UI thread. */
export const RevealSpark = ({
  index,
  color,
  progress,
  idle,
  width,
  height,
  originY,
  isOpening,
}: {
  index: number;
  color: string;
  progress: SharedValue<number>;
  idle: SharedValue<number>;
  width: number;
  height: number;
  originY: number;
  isOpening: boolean;
}) => {
  const tw = useTailwind();
  const angle = index * 2.39996;
  const wave = index % 3;
  const start = 0.1 + wave * 0.06;
  const distance = width * (0.38 + (index % 5) * 0.08);
  const isStreak = index % 4 === 0;
  const sparkColor = isOpening ? color : brandColor.grey100;
  const style = useAnimatedStyle(() => {
    const life = interpolate(
      progress.value,
      [start, 0.9 + wave * 0.025],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const travel = 1 - (1 - life) ** 4;
    const drift = Math.sin((idle.value + index / 13) * Math.PI * 2);
    const waiting = progress.value === 0;
    return {
      opacity: waiting
        ? index < 6
          ? 0.2 + Math.abs(drift) * 0.3
          : 0
        : interpolate(
            life,
            [0, 0.03, 0.48, 1],
            [0, 1, 0.95, 0],
            Extrapolation.CLAMP,
          ),
      transform: [
        {
          translateX: waiting
            ? Math.cos(angle) * width * 0.34
            : Math.cos(angle) * distance * travel +
              ((index % 5) - 2) * width * 0.055,
        },
        {
          translateY: waiting
            ? height * 0.25 + Math.sin(angle) * height * 0.2 + drift * 10
            : Math.sin(angle) * distance * travel + life * life * height * 0.28,
        },
        {
          rotate: `${(angle * 180) / Math.PI + (isStreak ? 90 : travel * 120)}deg`,
        },
        {
          scale: waiting
            ? 0.8
            : interpolate(
                life,
                [0, 0.12, 1],
                [0.3, 1.3, 0.3],
                Extrapolation.CLAMP,
              ),
        },
      ],
    };
  });

  return (
    <AnimatedBox
      twClassName="absolute left-1/2 rounded-full"
      style={[
        tw.style({
          top: originY,
          width: isStreak ? 3 : 5,
          height: isStreak ? 20 : 5,
          backgroundColor: sparkColor,
        }),
        glowStyle({
          color: sparkColor,
          radius: isStreak ? 5 : 8,
          opacity: 0.85,
        }),
        style,
      ]}
    >
      <Box
        twClassName="absolute inset-px rounded-full"
        style={{ backgroundColor: brandColor.white }}
      />
    </AnimatedBox>
  );
};

/** Diffuse cutting light with a tapered tail, readable against silver foil. */
export const SealSpark = () => {
  const id = useId();
  return (
    <Svg width={120} height={72} viewBox="0 0 120 72">
      <Defs>
        <RadialGradient id={`${id}-halo`}>
          <Stop offset="0" stopColor={brandColor.white} stopOpacity="1" />
          <Stop
            offset="0.2"
            stopColor={brandColor.blue100}
            stopOpacity="0.95"
          />
          <Stop
            offset="0.48"
            stopColor={brandColor.blue400}
            stopOpacity="0.65"
          />
          <Stop offset="1" stopColor={brandColor.blue400} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}-tail`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={brandColor.blue300} stopOpacity="0" />
          <Stop
            offset="0.6"
            stopColor={brandColor.blue300}
            stopOpacity="0.65"
          />
          <Stop offset="1" stopColor={brandColor.white} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="84" cy="36" rx="36" ry="34" fill={`url(#${id}-halo)`} />
      <Path
        d="M0 36 C30 33 64 29 84 32 C96 32 96 40 84 40 C64 43 30 39 0 36Z"
        fill={`url(#${id}-tail)`}
      />
      <Ellipse cx="84" cy="36" rx="4" ry="3" fill={brandColor.white} />
    </Svg>
  );
};

/** Rarity-colored rear light, or one brief narrow glint at the opening seam. */
export const RevealBurst = ({
  color,
  progress,
  originY,
  width,
  height,
  foreground = false,
}: {
  color: string;
  progress: SharedValue<number>;
  originY: number;
  width: number;
  height: number;
  foreground?: boolean;
}) => {
  const id = useId();
  const diameter = Math.max(1, Math.min(width * 0.95, 400));
  const style = useAnimatedStyle(() => {
    const descent = interpolate(
      progress.value,
      foreground ? [0.1, 0.6] : [0.1, 0.75],
      [0, 1],
      Extrapolation.CLAMP,
    );
    // Follow the opening pouch, then keep the rear light behind the emerging card.
    const drift =
      height *
      (foreground ? 0.9 : 0.3) *
      (0.35 * descent + 0.65 * descent * descent);
    const expansion = interpolate(
      progress.value,
      foreground ? [0.1, 0.135, 0.22] : [0.1, 0.18, 0.34, 0.75],
      foreground ? [0.55, 1, 1.1] : [0.28, 0.68, 1.16, 1.3],
      Extrapolation.CLAMP,
    );
    // Keep the transparent edge of the circular rear light inside the scene.
    // The foreground glint is flattened, so only its horizontal bound applies.
    const maxScale = Math.max(
      0,
      Math.min(
        width / diameter,
        foreground
          ? width / diameter
          : (2 * Math.min(originY + drift, height - originY - drift)) /
              diameter,
      ),
    );
    return {
      opacity: interpolate(
        progress.value,
        foreground
          ? [0.1, 0.135, 0.17, 0.22]
          : [0.1, 0.18, 0.3, 0.58, 0.78, 0.94],
        foreground ? [0, 0.68, 0.22, 0] : [0, 0.92, 1, 0.92, 0.4, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        { translateY: drift },
        { scale: Math.min(expansion, maxScale) },
        { rotate: `${foreground ? 0 : -8 + descent * 16}deg` },
      ],
    };
  });
  return (
    <AnimatedBox
      twClassName="absolute"
      style={[
        {
          width: diameter,
          height: diameter,
          left: (width - diameter) / 2,
          top: originY - diameter / 2,
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 320">
        <Defs>
          <RadialGradient id={`${id}-bloom`}>
            <Stop offset="0" stopColor={color} stopOpacity="0.88" />
            <Stop offset="0.24" stopColor={color} stopOpacity="0.82" />
            <Stop offset="0.58" stopColor={color} stopOpacity="0.38" />
            <Stop offset="0.84" stopColor={color} stopOpacity="0.08" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient
            id={`${id}-fans`}
            cx="160"
            cy="160"
            r="160"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={color} stopOpacity="0.62" />
            <Stop offset="0.4" stopColor={color} stopOpacity="0.55" />
            <Stop offset="0.75" stopColor={color} stopOpacity="0.22" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`${id}-seam`}>
            <Stop offset="0" stopColor={brandColor.white} stopOpacity="0.95" />
            <Stop
              offset="0.06"
              stopColor={brandColor.white}
              stopOpacity="0.85"
            />
            <Stop offset="0.16" stopColor={color} stopOpacity="0.92" />
            <Stop offset="0.55" stopColor={color} stopOpacity="0.6" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx="160"
          cy="160"
          rx="132"
          ry={foreground ? 12 : 132}
          fill={`url(#${id}-${foreground ? 'seam' : 'bloom'})`}
        />
        {!foreground &&
          [4, 57, 116, 179, 240, 302].map((angle) => (
            <Path
              key={angle}
              d="M160 160 L126 10 Q160 -2 194 10 Z"
              transform={`rotate(${angle} 160 160)`}
              fill={`url(#${id}-fans)`}
            />
          ))}
      </Svg>
    </AnimatedBox>
  );
};
