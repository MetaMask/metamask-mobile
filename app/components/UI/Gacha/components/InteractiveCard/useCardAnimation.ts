import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, PixelRatio } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { GachaInteractiveCardTestIds } from '../../Gacha.testIds';

const PERSPECTIVE = 1200;
const THICKNESS = 7;
const MIN_EDGE = 0.5;
/** Fixed layout width of the slab edge: its widest projection, reached edge-on. */
export const CARD_EDGE_WIDTH = THICKNESS + MIN_EDGE;

/** Motion stays on the UI thread; loops stop when hidden or motion is reduced. */
export const useCardAnimation = ({
  isActive,
  canFlip,
  width,
  resetKey,
  revealProgress,
}: {
  isActive: boolean;
  canFlip: boolean;
  width: number;
  resetKey: string;
  revealProgress?: SharedValue<number>;
}) => {
  const pixelRatio = PixelRatio.get();
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const [reduceMotion, setReduceMotion] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const flip = useSharedValue(0);
  const targetAngle = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const dragging = useSharedValue(false);
  const float = useSharedValue(0);
  const shine = useSharedValue(0);
  // Faces and the projected slab edge must use the same angle throughout the entrance.
  const presentationAngle = useDerivedValue(
    () =>
      flip.value +
      (revealProgress && !reduceMotion
        ? interpolate(
            revealProgress.value,
            [0.34, 0.78, 1],
            [12, -2, 0],
            Extrapolation.CLAMP,
          )
        : 0),
  );

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduceMotion(value);
      })
      .catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    const app = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);

  useEffect(() => {
    cancelAnimation(flip);
    flip.value = 0;
    targetAngle.value = 0;
    dragging.value = false;
    setIsFlipped(false);
    return () => cancelAnimation(flip);
  }, [canFlip, resetKey, flip, targetAngle, dragging]);

  const showFace = useCallback((angle: number) => {
    setIsFlipped(Math.abs(Math.round(angle / 180) % 2) === 1);
  }, []);

  const flipCard = useCallback(() => {
    if (!canFlip || !isActive || dragging.value) return;
    targetAngle.value += 180;
    flip.value = withTiming(targetAngle.value, {
      duration: reduceMotion ? 0 : 950,
      easing: Easing.inOut(Easing.cubic),
    });
    showFace(targetAngle.value);
  }, [canFlip, isActive, reduceMotion, flip, targetAngle, dragging, showFace]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(GachaInteractiveCardTestIds.PAN_GESTURE)
        .enabled(canFlip && isActive && foreground && width > 0)
        .activeOffsetX([-8, 8])
        .failOffsetY([-12, 12])
        .maxPointers(1)
        .onStart(() => {
          cancelAnimation(flip);
          dragStart.value = flip.value;
          dragging.value = true;
        })
        .onUpdate(({ translationX }) => {
          if (!dragging.value) return;
          flip.value = dragStart.value + (translationX / width) * 180;
        })
        .onFinalize((_, success) => {
          if (!dragging.value) return;
          // A cancelled gesture returns to its previous face.
          const destination = success
            ? Math.round(flip.value / 180) * 180
            : targetAngle.value;
          targetAngle.value = destination;
          flip.value = withTiming(destination, {
            duration: reduceMotion ? 0 : 350,
            easing: Easing.out(Easing.cubic),
          });
          dragging.value = false;
          scheduleOnRN(showFace, destination);
        }),
    [
      canFlip,
      isActive,
      foreground,
      width,
      reduceMotion,
      flip,
      dragStart,
      dragging,
      targetAngle,
      showFace,
    ],
  );

  useEffect(() => {
    if (isActive && foreground && !reduceMotion) {
      const timing = { duration: 2100, easing: Easing.inOut(Easing.sin) };
      float.value = withRepeat(
        withSequence(
          withTiming(1, timing),
          withTiming(-1, timing),
          withTiming(0, timing),
        ),
        -1,
      );
      const shimmer = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withDelay(2600, withTiming(0, { duration: 0 })),
        ),
        -1,
      );
      // Let the entrance's final reflection finish before the first idle sweep.
      shine.value = revealProgress ? withDelay(1800, shimmer) : shimmer;
    } else {
      float.value = 0;
      shine.value = 0;
      cancelAnimation(flip);
      flip.value = targetAngle.value;
      dragging.value = false;
    }
    return () => {
      cancelAnimation(float);
      cancelAnimation(shine);
    };
  }, [
    isActive,
    foreground,
    reduceMotion,
    float,
    shine,
    flip,
    targetAngle,
    dragging,
    revealProgress,
  ]);

  const floatingStyle = useAnimatedStyle(() => ({
    // Idle rotation/scale resamples the image; float on physical pixels instead.
    transform: [
      {
        translateY: dragging.value
          ? 0
          : Math.round(-3.6 * float.value * pixelRatio) / pixelRatio,
      },
    ],
  }));
  const frontStyle = useAnimatedStyle(() => {
    const angle = presentationAngle.value;
    return {
      backfaceVisibility: 'hidden',
      opacity: Math.cos((angle * Math.PI) / 180) >= 0 ? 1 : 0,
      transform: [{ perspective: PERSPECTIVE }, { rotateY: `${angle}deg` }],
    };
  });
  const backStyle = useAnimatedStyle(() => {
    const angle = presentationAngle.value;
    return {
      backfaceVisibility: 'hidden',
      opacity: Math.cos((angle * Math.PI) / 180) < 0 ? 1 : 0,
      transform: [
        { perspective: PERSPECTIVE },
        { rotateY: `${angle + 180}deg` },
      ],
    };
  });
  // Project the thin side of the slab: it remains visible when both faces are edge-on.
  // The edge keeps a fixed layout width and scales around its center, so flips never relayout.
  const edgeStyle = useAnimatedStyle(() => {
    const radians = (presentationAngle.value * Math.PI) / 180;
    const sine = Math.sin(radians);
    const edgeX = ((sine >= 0 ? -1 : 1) * width) / 2;
    const scale = 1 / (1 + (edgeX * sine) / PERSPECTIVE);
    const thickness = THICKNESS * Math.abs(sine) + MIN_EDGE;
    return {
      opacity: Math.abs(sine),
      transform: [
        {
          translateX:
            width / 2 + edgeX * Math.cos(radians) * scale - CARD_EDGE_WIDTH / 2,
        },
        { scaleX: thickness / CARD_EDGE_WIDTH },
        { scaleY: scale },
      ],
    };
  });
  const glareStyle = useAnimatedStyle(() => {
    const entering = revealProgress !== undefined && revealProgress.value < 1;
    const progress = entering
      ? interpolate(
          revealProgress.value,
          [0.75, 0.97],
          [0, 1],
          Extrapolation.CLAMP,
        )
      : dragging.value
        ? (Math.sin((flip.value * Math.PI) / 180) + 1) / 2
        : shine.value;
    return {
      opacity: reduceMotion
        ? 0
        : entering
          ? interpolate(
              revealProgress.value,
              [0.75, 0.8, 0.92, 0.98],
              [0, 0.65, 0.65, 0],
              Extrapolation.CLAMP,
            )
          : 0.4,
      transform: [
        { translateX: -width * 0.9 + progress * width * 2.3 },
        { skewX: '-18deg' },
      ],
    };
  });

  return {
    isFlipped,
    flipCard,
    panGesture,
    floatingStyle,
    frontStyle,
    backStyle,
    edgeStyle,
    glareStyle,
  };
};
