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
  testID?: string;
}

export const DEFAULT_FADE_IN_DISTANCE = 128;

// iOS: blur that fades out below the header, darkened toward the top.
const BLUR_TAIL_HEIGHT = 24;
const BLUR_INTENSITY = 60;
// The mask only reads alpha: opaque keeps the blur, transparent clears it.
const BLUR_MASK_OPACITIES = [1, 1, 0];
const BLUR_MASK_LOCATIONS = [0, 0.6, 1];
const BLUR_TINT_OPACITIES = [0.8, 0.5, 0];
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
const GRADIENT_OPACITIES = [1, 0.92, 0.65, 0];
const GRADIENT_LOCATIONS = [0, 0.5, 0.78, 1];

// Apple's blur misrenders when faded, so its strength animates instead.
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const styles = StyleSheet.create({
  blurTail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -BLUR_TAIL_HEIGHT,
  },
  gradientTail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -GRADIENT_TAIL_HEIGHT,
  },
  effect: {
    height: EFFECT_HEIGHT,
  },
});

/**
 * The background behind a header floating over content: blurred and darkened
 * on iOS, a dark gradient elsewhere. Fills its parent and fades out below it.
 */
const HeaderGlassBackdrop = ({
  scrollDistance,
  fadeInDistance = DEFAULT_FADE_IN_DISTANCE,
  testID,
}: HeaderGlassBackdropProps) => {
  const { colors } = useTheme();
  const { isGlassEnabled, isBlurEnabled, glassColorScheme } = useLiquidGlass();
  const canBlur = isGlassEnabled || isBlurEnabled;
  const opacities = canBlur ? BLUR_TINT_OPACITIES : GRADIENT_OPACITIES;
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
    intensity: BLUR_INTENSITY * progress.value,
  }));

  if (!canBlur) {
    return (
      <Animated.View
        pointerEvents="none"
        style={[styles.gradientTail, fadeStyle]}
      >
        <LinearGradient
          colors={tintColors}
          locations={GRADIENT_LOCATIONS}
          style={styles.effect}
          testID={testID}
        />
      </Animated.View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.blurTail}>
      <View style={styles.effect}>
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient
              colors={maskColors}
              locations={BLUR_MASK_LOCATIONS}
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
            style={StyleSheet.absoluteFill}
            testID={testID}
          />
        </Animated.View>
      </View>
    </View>
  );
};

export default HeaderGlassBackdrop;
