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
import { brandColor } from '@metamask/design-tokens';

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
  const angle = index * 2.39996;
  const wave = index % 3;
  const start = 0.1 + wave * 0.06;
  const distance = width * (0.38 + (index % 5) * 0.08);
  const isStreak = index % 4 === 0;
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
        {
          top: originY,
          width: isStreak ? 3 : 5,
          height: isStreak ? 20 : 5,
          backgroundColor: isOpening ? color : brandColor.grey100,
          shadowColor: isOpening ? color : brandColor.grey100,
          shadowOpacity: 0.85,
          shadowRadius: isStreak ? 5 : 8,
          shadowOffset: { width: 0, height: 0 },
        },
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

/** Expanding rear bloom, or one brief translucent accent at the opening seam. */
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
    const drift = interpolate(
      progress.value,
      foreground ? [0.08, 0.26] : [0.08, 0.7],
      [0, height * (foreground ? 0.28 : 0.2)],
      Extrapolation.CLAMP,
    );
    const expansion = interpolate(
      progress.value,
      foreground ? [0, 0.08, 0.16, 0.3] : [0, 0.1, 0.3, 0.7],
      foreground ? [0.25, 0.35, 1.4, 1.7] : [0.25, 0.45, 1.25, 1.75],
      Extrapolation.CLAMP,
    );
    // Keep the transparent outer edge inside the scene while light moves from seal to card.
    const maxScale = Math.max(
      0,
      (2 * Math.min(originY + drift, height - originY - drift)) / diameter,
    );
    return {
      opacity: interpolate(
        progress.value,
        foreground
          ? [0, 0.09, 0.13, 0.18, 0.3, 0.37]
          : [0, 0.08, 0.2, 0.42, 0.7, 0.86],
        foreground ? [0, 0, 0.52, 0.3, 0.07, 0] : [0, 0.1, 1, 0.96, 0.6, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        { translateY: drift },
        { scale: Math.min(expansion, maxScale) },
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
            <Stop offset="0" stopColor={brandColor.white} stopOpacity="1" />
            <Stop
              offset="0.22"
              stopColor={brandColor.white}
              stopOpacity="0.9"
            />
            <Stop offset="0.48" stopColor={color} stopOpacity="0.7" />
            <Stop offset="0.75" stopColor={color} stopOpacity="0.18" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx="160"
          cy="160"
          rx="132"
          ry="132"
          fill={`url(#${id}-bloom)`}
        />
        {!foreground &&
          [0, 35, 80, 125].map((angle) => (
            <Ellipse
              key={angle}
              cx="160"
              cy="160"
              rx="158"
              ry="9"
              rotation={angle}
              origin="160,160"
              fill={`url(#${id}-bloom)`}
            />
          ))}
      </Svg>
    </AnimatedBox>
  );
};
