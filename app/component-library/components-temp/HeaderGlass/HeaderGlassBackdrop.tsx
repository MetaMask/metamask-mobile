import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '../../../util/theme';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

export interface HeaderGlassBackdropProps {
  /** How far the content has scrolled from its resting top; omit to keep the effect on. */
  scrollDistance?: SharedValue<number>;
  /** Scroll distance over which the effect fades in. */
  fadeInDistance?: number;
  /**
   * The screen edge the backdrop sits on; it fades out away from it, e.g.
   * `bottom` under a floating footer.
   *
   * @default 'top'
   */
  edge?: 'top' | 'bottom';
  testID?: string;
}

export const DEFAULT_FADE_IN_DISTANCE = 128;

// iOS: blur that fades out below the header, darkened toward the top.
// The mask only reads alpha: opaque keeps the blur, transparent clears it.
const BLUR_MASK_OPACITIES = [1, 1, 0];
const BLUR_MASK_LOCATIONS = [0, 0.6, 1];
const BLUR_TINT_LOCATIONS = [0, 0.6, 1];
// Ultra thin barely tints, so the header matches the page until content passes under.
const BLUR_MATERIAL = {
  dark: 'systemUltraThinMaterialDark',
  light: 'systemUltraThinMaterialLight',
} as const;

// The effect covers this share of the header plus its tail, from the top down.
const EFFECT_HEIGHT = '90%';

// Android has no blur, so a darker and longer gradient carries the separation.
const GRADIENT_TAIL_HEIGHT = 40;
const GRADIENT_LOCATIONS = [0, 0.5, 0.78, 1];

// How strong and tall the effect is on each edge; the footer's is lighter and
// shorter than the header's. The blur reaches `blurTailHeight` past the bar and
// covers `blurHeight` of the bar plus that tail, measured from the screen edge.
const EDGE_STRENGTH = {
  top: {
    blurIntensity: 60,
    blurTintOpacities: [0.8, 0.5, 0],
    gradientOpacities: [1, 0.92, 0.65, 0],
    blurTailHeight: 24,
    blurHeight: '90%',
  },
  bottom: {
    blurIntensity: 5,
    blurTintOpacities: [0.3, 0.175, 0],
    gradientOpacities: [0.425, 0.35, 0.125, 0],
    blurTailHeight: 0,
    blurHeight: '90%',
  },
} as const;

// Apple's blur misrenders when faded, so its strength animates instead.
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Gradients run from the edge outwards.
const FADE_DIRECTION = {
  top: { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  bottom: { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 } },
} as const;

const styles = StyleSheet.create({
  blurTail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -EDGE_STRENGTH.top.blurTailHeight,
  },
  blurTailAbove: {
    position: 'absolute',
    top: -EDGE_STRENGTH.bottom.blurTailHeight,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  blurEffect: {
    height: EDGE_STRENGTH.top.blurHeight,
  },
  blurEffectAbove: {
    height: EDGE_STRENGTH.bottom.blurHeight,
  },
  gradientTail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -GRADIENT_TAIL_HEIGHT,
  },
  gradientTailAbove: {
    position: 'absolute',
    top: -GRADIENT_TAIL_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  effect: {
    height: EFFECT_HEIGHT,
  },
});

/**
 * The background behind a header or footer floating over content: blurred and
 * darkened on iOS, a dark gradient elsewhere. Fills its parent and fades out
 * past it, away from its `edge`.
 */
const HeaderGlassBackdrop = ({
  scrollDistance,
  fadeInDistance = DEFAULT_FADE_IN_DISTANCE,
  edge = 'top',
  testID,
}: HeaderGlassBackdropProps) => {
  const isBottom = edge === 'bottom';
  const direction = FADE_DIRECTION[edge];
  const strength = EDGE_STRENGTH[edge];
  const { colors } = useTheme();
  const { isGlassEnabled, isBlurEnabled, glassColorScheme } = useLiquidGlass();
  const canBlur = isGlassEnabled || isBlurEnabled;
  const opacities = canBlur
    ? strength.blurTintOpacities
    : strength.gradientOpacities;
  const tintColors = useMemo(
    () =>
      opacities.map((opacity) =>
        colorWithOpacity(colors.background.default, opacity),
      ),
    [colors.background.default, opacities],
  );
  const maskColors = useMemo(
    () =>
      BLUR_MASK_OPACITIES.map((opacity) =>
        colorWithOpacity(colors.background.default, opacity),
      ),
    [colors.background.default],
  );

  const progress = useDerivedValue(() =>
    scrollDistance
      ? interpolate(
          scrollDistance.value,
          [0, fadeInDistance],
          [0, 1],
          Extrapolation.CLAMP,
        )
      : 1,
  );
  const fadeStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const blurProps = useAnimatedProps(() => ({
    intensity: strength.blurIntensity * progress.value,
  }));

  if (!canBlur) {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          isBottom ? styles.gradientTailAbove : styles.gradientTail,
          fadeStyle,
        ]}
      >
        <LinearGradient
          colors={tintColors}
          locations={GRADIENT_LOCATIONS}
          {...direction}
          style={styles.effect}
          testID={testID}
        />
      </Animated.View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={isBottom ? styles.blurTailAbove : styles.blurTail}
    >
      <View style={isBottom ? styles.blurEffectAbove : styles.blurEffect}>
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient
              colors={maskColors}
              locations={BLUR_MASK_LOCATIONS}
              {...direction}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          <AnimatedBlurView
            tint={
              BLUR_MATERIAL[glassColorScheme === 'light' ? 'light' : 'dark']
            }
            animatedProps={blurProps}
            style={StyleSheet.absoluteFill}
          />
        </MaskedView>
        <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
          <LinearGradient
            colors={tintColors}
            locations={BLUR_TINT_LOCATIONS}
            {...direction}
            style={StyleSheet.absoluteFill}
            testID={testID}
          />
        </Animated.View>
      </View>
    </View>
  );
};

export default HeaderGlassBackdrop;
