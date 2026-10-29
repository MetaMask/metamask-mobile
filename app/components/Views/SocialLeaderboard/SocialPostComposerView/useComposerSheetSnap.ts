import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import {
  didPassSheetMidpoint,
  isDefaultAtTallCap,
  resolveSheetSnap,
  sheetDragDirection,
  SHEET_SNAP_DURATION_MS,
  tallSheetHeight,
  type SheetStop,
} from './sheetSnap';

const SNAP_TIMING: WithTimingConfig = {
  duration: SHEET_SNAP_DURATION_MS,
  easing: Easing.out(Easing.cubic),
};

export interface ComposerSheetSnap {
  sheetStyle: ReturnType<typeof useAnimatedStyle>;
  handleGesture: ReturnType<typeof Gesture.Pan>;
  headerGesture: ReturnType<typeof Gesture.Pan>;
  leadingEdgeGesture: ReturnType<typeof Gesture.Pan>;
  trailingEdgeGesture: ReturnType<typeof Gesture.Pan>;
  backdropStyle: ReturnType<typeof useAnimatedStyle>;
}

/**
 * Two-stop height for the composer attachment sheets.
 *
 * Network tier is read because these sheets show a list and an animation.
 * The gesture is local, so the tier does not change the heights or the
 * sheets' existing fetches.
 */
export function useComposerSheetSnap(
  defaultHeight: number,
  onDismiss: () => void,
): ComposerSheetSnap {
  const { height: windowHeight } = useWindowDimensions();
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  const prefersReducedMotion = useReducedMotion();
  const hardwareTier = getHardwareTier();
  useNetworkTier();
  const isAnimated = !prefersReducedMotion && hardwareTier !== 'LOW';

  const tall = tallSheetHeight(windowHeight, topInset, bottomInset);
  const restingDefault = defaultHeight > 0 ? Math.min(defaultHeight, tall) : 0;

  const height = useSharedValue(restingDefault);
  const translateY = useSharedValue(0);
  const defaultSV = useSharedValue(restingDefault);
  const tallSV = useSharedValue(tall);
  const stop = useSharedValue(0);
  const isAnimatedSV = useSharedValue(isAnimated);
  const windowHeightSV = useSharedValue(windowHeight);
  const dragStartHeight = useSharedValue(restingDefault);
  const dragStartedAtDefault = useSharedValue(1);
  const gestureStop = useSharedValue(0);
  const laidOut = useSharedValue(restingDefault > 0);
  const interacting = useSharedValue(0);
  const bottomInsetSV = useSharedValue(bottomInset);
  const appliedDefault = useRef(restingDefault);

  const dismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    isAnimatedSV.value = isAnimated;
    windowHeightSV.value = windowHeight;
    bottomInsetSV.value = bottomInset;
    tallSV.value = tall;
    defaultSV.value = restingDefault;
    if (
      restingDefault <= 0 ||
      interacting.value === 1 ||
      stop.value !== 0 ||
      translateY.value !== 0
    ) {
      return;
    }
    const defaultChanged = appliedDefault.current !== restingDefault;
    appliedDefault.current = restingDefault;
    if (!laidOut.value) {
      height.value = restingDefault;
      laidOut.value = true;
      return;
    }
    if (!defaultChanged) {
      return;
    }
    if (isAnimated) {
      height.value = withTiming(restingDefault, SNAP_TIMING);
    } else {
      height.value = restingDefault;
    }
  }, [
    bottomInset,
    bottomInsetSV,
    defaultSV,
    height,
    interacting,
    isAnimated,
    isAnimatedSV,
    laidOut,
    restingDefault,
    stop,
    tall,
    tallSV,
    translateY,
    windowHeight,
    windowHeightSV,
  ]);

  const gestures = useMemo(() => {
    const makePan = () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .onStart(() => {
          'worklet';
          cancelAnimation(height);
          cancelAnimation(translateY);
          interacting.value = 1;
          dragStartHeight.value = height.value;
          dragStartedAtDefault.value =
            height.value <= defaultSV.value + 1 ? 1 : 0;
          gestureStop.value = stop.value;
        })
        .onUpdate((event) => {
          'worklet';
          const { translationY } = event;
          const def = defaultSV.value;
          const cap = tallSV.value;
          if (dragStartedAtDefault.value === 1) {
            if (translationY < 0) {
              translateY.value = 0;
              height.value = Math.min(cap, Math.max(def, def - translationY));
              return;
            }
            height.value = def;
            translateY.value = translationY;
            return;
          }
          height.value = Math.min(
            cap,
            Math.max(def, dragStartHeight.value - translationY),
          );
          translateY.value = 0;
        })
        .onEnd((event) => {
          'worklet';
          const { translationY, velocityY } = event;
          const { direction, isFling } = sheetDragDirection(
            translationY,
            velocityY,
          );
          const currentStop: SheetStop =
            gestureStop.value === 1 ? 'tall' : 'default';
          const def = defaultSV.value;
          const cap = tallSV.value;
          const target = resolveSheetSnap({
            stop: currentStop,
            direction,
            passedMidpoint: didPassSheetMidpoint({
              stop: currentStop,
              direction,
              translationY,
              defaultHeight: def,
              tallHeight: cap,
            }),
            isFling,
            defaultIsTallCap: isDefaultAtTallCap(def, cap),
          });

          const timing = {
            duration: SHEET_SNAP_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          };

          if (target === 'dismiss') {
            if (!isAnimatedSV.value) {
              interacting.value = 0;
              scheduleOnRN(dismiss);
              return;
            }
            translateY.value = withTiming(
              windowHeightSV.value,
              timing,
              (finished) => {
                if (finished) {
                  interacting.value = 0;
                  scheduleOnRN(dismiss);
                }
              },
            );
            return;
          }

          const nextHeight = target === 'tall' ? cap : def;
          stop.value = target === 'tall' ? 1 : 0;
          if (isAnimatedSV.value) {
            height.value = withTiming(nextHeight, timing, (finished) => {
              if (finished) {
                interacting.value = 0;
              }
            });
            translateY.value = withTiming(0, timing);
          } else {
            height.value = nextHeight;
            translateY.value = 0;
            interacting.value = 0;
          }
        });

    return {
      handleGesture: makePan(),
      headerGesture: makePan(),
      leadingEdgeGesture: makePan(),
      trailingEdgeGesture: makePan(),
    };
  }, [
    defaultSV,
    dismiss,
    dragStartHeight,
    dragStartedAtDefault,
    gestureStop,
    height,
    interacting,
    isAnimatedSV,
    stop,
    tallSV,
    translateY,
    windowHeightSV,
  ]);

  const sheetStyle = useAnimatedStyle(() => {
    if (!laidOut.value) {
      return {};
    }
    return {
      height: height.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    if (!laidOut.value || height.value <= 0) {
      return { height: 0 };
    }
    return {
      height: Math.max(
        0,
        windowHeightSV.value - height.value - bottomInsetSV.value,
      ),
    };
  });

  return {
    sheetStyle,
    ...gestures,
    backdropStyle,
  };
}
