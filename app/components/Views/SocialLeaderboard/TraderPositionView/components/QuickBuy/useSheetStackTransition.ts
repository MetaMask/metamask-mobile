import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  SHEET_STACK_HEIGHT_DURATION,
  SHEET_STACK_HEIGHT_EASING,
  SHEET_STACK_OPACITY_IN_DELAY,
  SHEET_STACK_OPACITY_IN_DURATION,
  SHEET_STACK_OPACITY_OUT_DURATION,
  SHEET_STACK_PUSH_DURATION,
  SHEET_STACK_PUSH_EASING,
} from './sheetStackMotion';

const stackPushEasing = Easing.bezier(
  SHEET_STACK_PUSH_EASING[0],
  SHEET_STACK_PUSH_EASING[1],
  SHEET_STACK_PUSH_EASING[2],
  SHEET_STACK_PUSH_EASING[3],
);

const stackHeightEasing = Easing.bezier(
  SHEET_STACK_HEIGHT_EASING[0],
  SHEET_STACK_HEIGHT_EASING[1],
  SHEET_STACK_HEIGHT_EASING[2],
  SHEET_STACK_HEIGHT_EASING[3],
);

const stackOpacityInEasing = Easing.out(Easing.ease);
const stackOpacityOutEasing = Easing.in(Easing.ease);

/**
 * In-sheet push/pop matching web SheetStack / DS BottomSheet stories:
 * full-width slide + opacity crossfade (0.45s content ease) and synced height tween.
 * Backdrop / sheet Y / handle stay put.
 *
 * Detail screens are often scrollable (`flex-1`). Those need a bounded height, so
 * push never shrinks below the measured root (amount) height — the sheet stays
 * put or grows, and the detail layer fills the tweening box.
 */
export const useSheetStackTransition = () => {
  const [stackWidth, setStackWidth] = useState(0);
  const [isPushed, setIsPushed] = useState(false);
  const [isHeightReady, setIsHeightReady] = useState(false);
  const isAnimatingRef = useRef(false);
  const isPushedRef = useRef(false);
  /** When true, the next detail onLayout should kick off push (detail just mounted). */
  const pendingPushRef = useRef(false);

  const progress = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const rootHeight = useSharedValue(0);
  const detailHeight = useSharedValue(0);
  const widthSv = useSharedValue(0);
  const rootOpacity = useSharedValue(1);
  const detailOpacity = useSharedValue(0);

  const animateTo = useCallback(
    (next: 0 | 1) => {
      // Never tween height to 0 — if detail hasn't measured yet (or is a
      // flex-fill scroller whose intrinsic height is just the header), keep at
      // least the amount-screen height so the sheet doesn't collapse.
      const measuredDetail = detailHeight.value;
      const measuredRoot = rootHeight.value;
      const targetHeight =
        next === 1
          ? Math.max(measuredDetail, measuredRoot)
          : measuredRoot > 0
            ? measuredRoot
            : contentHeight.value;

      if (targetHeight <= 0 && next === 1) {
        // Root also unmeasured — bail; caller should retry after layout.
        return false;
      }

      isAnimatingRef.current = true;
      isPushedRef.current = next === 1;
      setIsPushed(next === 1);
      if (next === 1) {
        pendingPushRef.current = false;
      }

      progress.value = withTiming(next, {
        duration: SHEET_STACK_PUSH_DURATION,
        easing: stackPushEasing,
        reduceMotion: ReduceMotion.System,
      });

      if (targetHeight > 0) {
        contentHeight.value = withTiming(targetHeight, {
          duration: SHEET_STACK_HEIGHT_DURATION,
          easing: stackHeightEasing,
          reduceMotion: ReduceMotion.System,
        });
      }

      if (next === 1) {
        rootOpacity.value = withTiming(0, {
          duration: SHEET_STACK_OPACITY_OUT_DURATION,
          easing: stackOpacityOutEasing,
          reduceMotion: ReduceMotion.System,
        });
        detailOpacity.value = withDelay(
          SHEET_STACK_OPACITY_IN_DELAY,
          withTiming(1, {
            duration: SHEET_STACK_OPACITY_IN_DURATION,
            easing: stackOpacityInEasing,
            reduceMotion: ReduceMotion.System,
          }),
        );
      } else {
        detailOpacity.value = withTiming(0, {
          duration: SHEET_STACK_OPACITY_OUT_DURATION,
          easing: stackOpacityOutEasing,
          reduceMotion: ReduceMotion.System,
        });
        rootOpacity.value = withDelay(
          SHEET_STACK_OPACITY_IN_DELAY,
          withTiming(1, {
            duration: SHEET_STACK_OPACITY_IN_DURATION,
            easing: stackOpacityInEasing,
            reduceMotion: ReduceMotion.System,
          }),
        );
      }

      const clearMs = Math.max(
        SHEET_STACK_PUSH_DURATION,
        SHEET_STACK_HEIGHT_DURATION,
      );
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, clearMs);

      return true;
    },
    [
      contentHeight,
      detailHeight,
      detailOpacity,
      progress,
      rootHeight,
      rootOpacity,
    ],
  );

  // Stable identities — callers sync from activeScreen in an effect and must
  // not re-fire when isPushed flips mid-animation.
  const push = useCallback(() => {
    if (isPushedRef.current) {
      pendingPushRef.current = false;
      return true;
    }
    const started = animateTo(1);
    if (started) {
      pendingPushRef.current = false;
    }
    return started;
  }, [animateTo]);

  /**
   * Mount detail first, then call this. Push runs after detail layout when
   * heights are unknown; if the amount root is already measured, push starts
   * immediately using that height as a floor (avoids collapsing the sheet).
   */
  const requestPush = useCallback(() => {
    if (isPushedRef.current) {
      pendingPushRef.current = false;
      return;
    }
    // Always arm pending so a late detail layout can still sync height, but
    // start the slide as soon as we have a root height floor.
    pendingPushRef.current = true;
    if (rootHeight.value > 0 || detailHeight.value > 0) {
      animateTo(1);
    }
  }, [animateTo, detailHeight, rootHeight]);

  const pop = useCallback(() => {
    pendingPushRef.current = false;
    if (isPushedRef.current) {
      animateTo(0);
    }
  }, [animateTo]);

  /**
   * Jump to a pushed state without animating from root — used when entering a
   * stack screen from another non-root screen (e.g. selectQuote → quoteDetails)
   * where the sheet is already drilled in.
   */
  const snapToPushed = useCallback(() => {
    pendingPushRef.current = false;
    isAnimatingRef.current = false;
    isPushedRef.current = true;
    progress.value = 1;
    rootOpacity.value = 0;
    detailOpacity.value = 1;
    const nextHeight = Math.max(detailHeight.value, rootHeight.value);
    if (nextHeight > 0) {
      contentHeight.value = nextHeight;
    }
    setIsPushed(true);
  }, [
    contentHeight,
    detailHeight,
    detailOpacity,
    progress,
    rootHeight,
    rootOpacity,
  ]);

  const onStackLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0 && width !== stackWidth) {
      setStackWidth(width);
      widthSv.value = width;
    }
  };

  const onRootLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height <= 0) {
      return;
    }
    rootHeight.value = height;
    if (!isHeightReady) {
      contentHeight.value = height;
      setIsHeightReady(true);
    } else if (!isPushedRef.current && !isAnimatingRef.current) {
      // Sync only at rest — never cancel an in-flight height tween.
      contentHeight.value = height;
    }
  };

  const onDetailLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height <= 0) {
      return;
    }
    detailHeight.value = height;

    if (pendingPushRef.current) {
      pendingPushRef.current = false;
      // If push already started from requestPush (root height floor), this is
      // a no-op for progress; animateTo still refreshes height if taller.
      if (!isPushedRef.current) {
        animateTo(1);
      } else if (!isAnimatingRef.current) {
        contentHeight.value = Math.max(height, rootHeight.value);
      }
      return;
    }

    if (isPushedRef.current && !isAnimatingRef.current) {
      // Grow with taller detail content; never shrink below the amount root
      // (scrollable pay-with fills the root height via flex).
      contentHeight.value = Math.max(height, rootHeight.value);
    }
  };

  const heightStyle = useAnimatedStyle(() => ({
    height: contentHeight.value > 0 ? contentHeight.value : undefined,
  }));

  const rootScreenStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [0, -widthSv.value]),
      },
    ],
    opacity: rootOpacity.value,
  }));

  const detailScreenStyle = useAnimatedStyle(() => {
    // Until width is measured, keep detail off-screen so it doesn't cover root.
    const x =
      widthSv.value > 0
        ? interpolate(progress.value, [0, 1], [widthSv.value, 0])
        : 9999;
    // Bound the detail box to the tweening sheet height so `flex-1` scroll
    // children (pay with) actually fill and scroll instead of collapsing.
    const height = contentHeight.value > 0 ? contentHeight.value : undefined;
    return {
      transform: [{ translateX: x }],
      opacity: detailOpacity.value,
      height,
    };
  });

  return {
    isPushed,
    isHeightReady,
    push,
    requestPush,
    pop,
    snapToPushed,
    onStackLayout,
    onRootLayout,
    onDetailLayout,
    heightStyle,
    rootScreenStyle,
    detailScreenStyle,
  };
};

export type SheetStackTransition = ReturnType<typeof useSheetStackTransition>;

export { Animated };
