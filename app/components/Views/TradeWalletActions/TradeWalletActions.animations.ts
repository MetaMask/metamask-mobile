import {
  Easing,
  ReduceMotion,
  withSpring,
  withTiming,
  type LayoutAnimation,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

const ENTER_SCALE = 0.78;
// Small enough that a bottom-anchored scale lands on the source control.
const EXIT_SCALE = 0.35;
const EXIT_DURATION = 200;

// Response 0.35s at a 0.72 damping ratio: the quick, slightly underdamped
// spring of the SpringBoard context menu.
export const SPRINGBOARD_SPRING: WithSpringConfig = {
  mass: 1,
  stiffness: 322,
  damping: 26,
  overshootClamping: false,
  energyThreshold: 0.001,
  reduceMotion: ReduceMotion.System,
};

// Fades keep running under Reduce Motion so the zoom degrades to a crossfade.
export const SPRINGBOARD_FADE_IN: WithTimingConfig = {
  duration: 120,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.Never,
};

export const SPRINGBOARD_FADE_OUT: WithTimingConfig = {
  duration: 110,
  easing: Easing.in(Easing.quad),
  reduceMotion: ReduceMotion.Never,
};

// The glass path grows the surface's own frame instead of scaling its layer:
// `UIGlassEffect` renders its refraction at the layer's size, so a scaled glass
// layer warps and its corner radius visibly wobbles mid-flight.
// Close plays that morph backward: most of the collapse is immediate, then the
// opaque surface eases into the source button. It does not bounce.
export const MORPH_COLLAPSE: WithTimingConfig = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

// Content arrives at its final size and cross-fades, so labels never stretch.
export const MORPH_CONTENT_FADE_IN: WithTimingConfig = {
  duration: 140,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.Never,
};

export const MORPH_CONTENT_FADE_OUT: WithTimingConfig = {
  duration: 70,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.Never,
};

/** A menu edge, in the coordinates the morph animates between. */
export interface MorphRect {
  left: number;
  bottom: number;
  width: number;
  height: number;
  borderRadius: number;
}

/**
 * The button rect the menu grows out of, and the rect it settles into: the
 * full-width tray sitting a gap above the button it was opened from.
 */
export const getMorphRects = ({
  buttonLayout,
  containerHeight,
  containerWidth,
  horizontalInset,
  gap,
  trayHeight,
  trayRadius,
}: {
  buttonLayout: { x: number; y: number; width: number; height: number };
  containerHeight: number;
  containerWidth: number;
  horizontalInset: number;
  gap: number;
  trayHeight: number;
  trayRadius: number;
}): { from: MorphRect; to: MorphRect } => {
  const buttonBottom = containerHeight - buttonLayout.y - buttonLayout.height;

  return {
    from: {
      left: buttonLayout.x,
      bottom: buttonBottom,
      width: buttonLayout.width,
      height: buttonLayout.height,
      borderRadius: buttonLayout.height / 2,
    },
    to: {
      left: horizontalInset,
      bottom: buttonBottom + buttonLayout.height + gap,
      width: containerWidth - horizontalInset * 2,
      height: trayHeight,
      borderRadius: trayRadius,
    },
  };
};

/** Pops the menu out from its `transformOrigin`, like a SpringBoard menu. */
export const springboardEnter = (): LayoutAnimation => {
  'worklet';

  return {
    initialValues: {
      opacity: 0,
      transform: [{ scale: ENTER_SCALE }],
    },
    animations: {
      opacity: withTiming(1, SPRINGBOARD_FADE_IN),
      transform: [{ scale: withSpring(1, SPRINGBOARD_SPRING) }],
    },
  };
};

/**
 * Retracts the menu into its `transformOrigin`. The scale is front-loaded so
 * the surface is already small while the fade, eased in, is still holding.
 */
export const springboardExit = (): LayoutAnimation => {
  'worklet';

  return {
    initialValues: {
      opacity: 1,
      transform: [{ scale: 1 }],
    },
    animations: {
      opacity: withTiming(0, {
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.quad),
        reduceMotion: ReduceMotion.Never,
      }),
      transform: [
        {
          scale: withTiming(EXIT_SCALE, {
            duration: EXIT_DURATION,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          }),
        },
      ],
    },
  };
};
