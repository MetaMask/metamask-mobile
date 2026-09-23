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
const EXIT_SCALE = 0.9;
const EXIT_SCALE_DURATION = 120;

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

/** Shrinks the menu back toward its `transformOrigin` while it fades. */
export const springboardExit = (): LayoutAnimation => {
  'worklet';

  return {
    initialValues: {
      opacity: 1,
      transform: [{ scale: 1 }],
    },
    animations: {
      opacity: withTiming(0, SPRINGBOARD_FADE_OUT),
      transform: [
        {
          scale: withTiming(EXIT_SCALE, {
            duration: EXIT_SCALE_DURATION,
            easing: Easing.in(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          }),
        },
      ],
    },
  };
};
