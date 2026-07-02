import { useCallback, useEffect, useMemo, useRef } from 'react';
import { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  amountToPercent,
  clampAmount,
  MAX_AMOUNT,
  percentToAmount,
  SNAP_POINTS,
} from '../utils/musdCalculatorSlider';

export const MUSD_SLIDER_TRACK_HEIGHT = 12;
export const MUSD_SLIDER_THUMB_SIZE_REST = 24;
export const MUSD_SLIDER_THUMB_SIZE_DRAG = 32;
export const MUSD_SLIDER_THUMB_DRAG_SCALE =
  MUSD_SLIDER_THUMB_SIZE_DRAG / MUSD_SLIDER_THUMB_SIZE_REST;
export const MUSD_SLIDER_ROW_HEIGHT = 32;
const SLIDER_AMOUNT_THROTTLE_MS = 48;
export const MUSD_SLIDER_INITIAL_AMOUNT = SNAP_POINTS[1];

export function useMusdCalculatorSlider(
  amount: number,
  onAmountChange: (nextAmount: number) => void,
) {
  const thumbScale = useSharedValue(1);
  const trackWidthShared = useSharedValue(0);
  const thumbLinearPctShared = useSharedValue(
    amountToPercent(MUSD_SLIDER_INITIAL_AMOUNT),
  );
  const lastThrottledAmountSyncRef = useRef(0);

  useEffect(() => {
    thumbLinearPctShared.value = amountToPercent(Math.min(amount, MAX_AMOUNT));
  }, [amount, thumbLinearPctShared]);

  const syncAmountFromLinearPct = useCallback(
    (linearPct: number, force: boolean) => {
      const now = globalThis.performance.now();
      if (
        !force &&
        now - lastThrottledAmountSyncRef.current < SLIDER_AMOUNT_THROTTLE_MS
      ) {
        return;
      }
      lastThrottledAmountSyncRef.current = now;
      onAmountChange(clampAmount(percentToAmount(linearPct)));
    },
    [onAmountChange],
  );

  const commitSliderAtX = useCallback(
    (x: number) => {
      const w = trackWidthShared.value;
      if (w <= 0) {
        return;
      }
      const clampedX = Math.max(0, Math.min(w, x));
      const linearPct = (clampedX / w) * 100;
      thumbLinearPctShared.value = linearPct;
      const next = clampAmount(percentToAmount(linearPct));
      onAmountChange(next);
      thumbLinearPctShared.value = amountToPercent(next);
      lastThrottledAmountSyncRef.current = 0;
    },
    [onAmountChange, thumbLinearPctShared, trackWidthShared],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(2)
        .onBegin(() => {
          thumbScale.value = withTiming(MUSD_SLIDER_THUMB_DRAG_SCALE, {
            duration: 150,
          });
        })
        .onUpdate((e) => {
          const w = trackWidthShared.value;
          if (w <= 0) {
            return;
          }
          const clampedX = Math.max(0, Math.min(w, e.x));
          const linearPct = (clampedX / w) * 100;
          thumbLinearPctShared.value = linearPct;
          runOnJS(syncAmountFromLinearPct)(linearPct, false);
        })
        .onEnd((e) => {
          runOnJS(commitSliderAtX)(e.x);
        })
        .onFinalize(() => {
          thumbScale.value = withTiming(1, { duration: 150 });
        }),
    [
      thumbScale,
      thumbLinearPctShared,
      trackWidthShared,
      syncAmountFromLinearPct,
      commitSliderAtX,
    ],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd((e) => {
        runOnJS(commitSliderAtX)(e.x);
      }),
    [commitSliderAtX],
  );

  const sliderGesture = useMemo(
    () => Gesture.Simultaneous(tapGesture, panGesture),
    [tapGesture, panGesture],
  );

  const animatedFillStyle = useAnimatedStyle(() => {
    const w = trackWidthShared.value;
    const pct = thumbLinearPctShared.value;
    return { width: (pct / 100) * w };
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    const w = trackWidthShared.value;
    const pct = thumbLinearPctShared.value;
    const filled = (pct / 100) * w;
    return {
      transform: [{ scale: thumbScale.value }],
      left: filled - MUSD_SLIDER_THUMB_SIZE_REST / 2,
    };
  });

  const handleSliderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      trackWidthShared.value = event.nativeEvent.layout.width;
    },
    [trackWidthShared],
  );

  return {
    animatedFillStyle,
    animatedThumbStyle,
    handleSliderLayout,
    sliderGesture,
  };
}
