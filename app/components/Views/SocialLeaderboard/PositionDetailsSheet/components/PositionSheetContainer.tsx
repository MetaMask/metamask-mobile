import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@metamask/design-system-react-native';
import {
  Theme,
  useTailwind,
  useTheme,
} from '@metamask/design-system-twrnc-preset';
import {
  AnimationDuration,
  darkTheme,
  lightTheme,
} from '@metamask/design-tokens';
import { fireImpact, ImpactMoment } from '../../../../../util/haptics';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';
import {
  SHEET_SPRING,
  getScrollViewportHeight,
  getSheetHeight,
  resolveSheetDrag,
  shouldDismissSheet,
} from '../utils/sheetGesture';
import { SheetChartFrameContext } from './sheetChartFrame';
import { SheetScrollViewportContext } from './sheetScrollViewport';

const ANDROID_BOTTOM_PADDING = 16;

export interface PositionSheetContainerRef {
  /** Slides the sheet away, then calls `onClosed` followed by `callback`. */
  close: (callback?: () => void) => void;
  /** User-initiated close: the same slide, with the dismiss haptic. */
  dismiss: () => void;
}

export interface PositionSheetContainerProps {
  /** Pinned above the list. Dragging it always drags the sheet. */
  header: React.ReactNode;
  /** Pinned below the list. */
  footer?: React.ReactNode;
  /** Scrollable content. Pulling down at the top hands off to the sheet. */
  children: React.ReactNode;
  /** Runs once the close animation finishes. */
  onClosed: () => void;
  /** Runs once the open animation has finished. */
  onOpened?: () => void;
  onDragStart?: () => void;
  /** Runs once the sheet has settled back open after a drag. */
  onDragEnd?: () => void;
  testID?: string;
}

/**
 * Swipeable sheet for the position details. The DS `BottomSheet` hardcodes
 * its pan (no direction lock, 60% dismiss distance, no scroll handoff), so
 * this keeps its look but owns the gesture. Slide and backdrop both read one
 * shared offset on the UI thread, so they never drift apart.
 */
const PositionSheetContainer = forwardRef<
  PositionSheetContainerRef,
  PositionSheetContainerProps
>(
  (
    {
      header,
      footer,
      children,
      onClosed,
      onOpened,
      onDragStart,
      onDragEnd,
      testID,
    },
    ref,
  ) => {
    const tw = useTailwind();
    const theme = useTheme();
    const { height: windowHeight } = useWindowDimensions();
    const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
    const isReducedMotion = useReducedMotion();
    const sheetHeight = getSheetHeight(windowHeight, topInset);
    const estimatedViewportHeight = getScrollViewportHeight(
      windowHeight,
      topInset,
      bottomInset,
      Boolean(footer),
    );
    const [measuredViewportHeight, setMeasuredViewportHeight] = useState<
      number | null
    >(null);
    const scrollViewportHeight =
      measuredViewportHeight ?? estimatedViewportHeight;
    const shadow =
      theme === Theme.Light
        ? lightTheme.shadows.size.lg
        : darkTheme.shadows.size.lg;
    const paddingBottom =
      Platform.OS === 'android'
        ? bottomInset + ANDROID_BOTTOM_PADDING
        : bottomInset;

    const offset = useSharedValue(isReducedMotion ? 0 : sheetHeight);
    const fade = useSharedValue(isReducedMotion ? 0 : 1);
    const scrollY = useSharedValue(0);
    const contentTop = useSharedValue(0);
    const contentBottom = useSharedValue(0);
    const isTouchInContent = useSharedValue(false);
    const didStartAtTop = useSharedValue(true);
    const dragOrigin = useSharedValue(0);
    const isClosing = useSharedValue(false);
    const didMoveSheet = useSharedValue(false);
    const chartContentY = useSharedValue(-1);
    const chartHeight = useSharedValue(0);
    const touchStartX = useSharedValue(0);
    const touchStartY = useSharedValue(0);
    const touchInChart = useSharedValue(false);
    const touchClaim = useSharedValue(0);
    const sheetHostRef = useRef<View>(null);
    const scrollRef = useAnimatedRef<Animated.ScrollView>();
    const closeCallbackRef = useRef<(() => void) | undefined>(undefined);

    const handleCloseFinished = useCallback(() => {
      const callback = closeCallbackRef.current;
      closeCallbackRef.current = undefined;
      onClosed();
      callback?.();
    }, [onClosed]);

    const notifyDragStart = useCallback(
      (): void => onDragStart?.(),
      [onDragStart],
    );
    const notifyDragEnd = useCallback((): void => onDragEnd?.(), [onDragEnd]);
    const notifyOpened = useCallback((): void => onOpened?.(), [onOpened]);
    const fireDismissHaptic = useCallback(
      (): void => fireImpact(ImpactMoment.SheetDismiss),
      [],
    );

    const animateClose = useCallback(
      (velocityY: number) => {
        'worklet';
        const onFinish = (finished?: boolean) => {
          'worklet';
          if (finished) scheduleOnRN(handleCloseFinished);
        };
        if (isReducedMotion) {
          fade.value = withTiming(
            0,
            { duration: AnimationDuration.Promptly },
            onFinish,
          );
          return;
        }
        offset.value = withSpring(
          sheetHeight,
          { ...SHEET_SPRING, velocity: velocityY },
          onFinish,
        );
      },
      [fade, handleCloseFinished, isReducedMotion, offset, sheetHeight],
    );

    const close = useCallback(
      (callback?: () => void) => {
        if (isClosing.value) return;
        isClosing.value = true;
        closeCallbackRef.current = callback;
        animateClose(0);
      },
      [animateClose, isClosing],
    );

    const dismiss = useCallback(() => {
      if (isClosing.value) return;
      fireDismissHaptic();
      close();
    }, [close, fireDismissHaptic, isClosing]);

    useImperativeHandle(ref, () => ({ close, dismiss }), [close, dismiss]);

    // Shared values are stable and reduced motion is read once, so this runs
    // only on mount.
    useEffect(() => {
      const onFinish = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(notifyOpened);
      };
      if (isReducedMotion) {
        fade.value = withTiming(
          1,
          { duration: AnimationDuration.Promptly },
          onFinish,
        );
      } else {
        offset.value = withSpring(0, SHEET_SPRING, onFinish);
      }
    }, [fade, isReducedMotion, notifyOpened, offset]);

    useEffect(() => {
      if (Platform.OS !== 'android') return undefined;
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        (): boolean => {
          dismiss();
          return true;
        },
      );
      return () => subscription.remove();
    }, [dismiss]);

    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
        scrollY.value = event.contentOffset.y;
      },
    });

    const handleScrollLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const { y, height } = event.nativeEvent.layout;
        contentTop.value = y;
        contentBottom.value = y + height;
        setMeasuredViewportHeight((current) =>
          current === height ? current : height,
        );
      },
      [contentBottom, contentTop],
    );

    const scrollGesture = useMemo(() => Gesture.Native(), []);

    const dragGesture = useMemo(
      () =>
        Gesture.Pan()
          .withTestId(PositionDetailsSheetSelectorsIDs.DRAG_GESTURE)
          // Downward only, once the finger has moved 10pt. On the chart, a
          // straight vertical swipe can scroll or dismiss; a sideways lean
          // is left to the scrub.
          .manualActivation(true)
          .cancelsTouchesInView(false)
          .simultaneousWithExternalGesture(scrollGesture)
          .onTouchesDown((event) => {
            const touch = event.allTouches[0];
            touchClaim.value = 0;
            if (!touch) return;
            touchStartX.value = touch.x;
            touchStartY.value = touch.y;
            const chartY = chartContentY.value - scrollY.value;
            touchInChart.value =
              chartHeight.value > 0 &&
              chartContentY.value >= 0 &&
              touch.y >= chartY &&
              touch.y <= chartY + chartHeight.value;
          })
          .onTouchesMove((event, state) => {
            if (touchClaim.value !== 0) return;
            const touch = event.allTouches[0];
            if (!touch) {
              touchClaim.value = 2;
              state.fail();
              return;
            }
            const decision = resolveSheetDrag(
              touch.x - touchStartX.value,
              touch.y - touchStartY.value,
              touchInChart.value,
              scrollY.value <= 0,
            );
            if (decision === 'drag') {
              touchClaim.value = 1;
              state.activate();
              return;
            }
            if (decision === 'fail') {
              touchClaim.value = 2;
              state.fail();
            }
          })
          .onTouchesUp((_event, state) => {
            if (touchClaim.value !== 0) return;
            touchClaim.value = 2;
            state.fail();
          })
          .onBegin((event) => {
            isTouchInContent.value =
              event.y >= contentTop.value && event.y <= contentBottom.value;
            didStartAtTop.value = scrollY.value <= 0;
          })
          .onStart((event) => {
            if (isClosing.value) return;
            didMoveSheet.value = false;
            dragOrigin.value = event.translationY - offset.value;
          })
          .onUpdate((event) => {
            if (isClosing.value) return;
            if (
              isTouchInContent.value &&
              offset.value <= 0 &&
              scrollY.value > 0
            ) {
              // The list scrolls first; the sheet follows from scrollY = 0.
              dragOrigin.value = event.translationY;
              return;
            }
            let next = event.translationY - dragOrigin.value;
            if (next < 0) {
              next = 0;
              if (isTouchInContent.value) dragOrigin.value = event.translationY;
            }
            if (next > 0 && !didMoveSheet.value) {
              didMoveSheet.value = true;
              scheduleOnRN(notifyDragStart);
            }
            offset.value = next;
            if (isTouchInContent.value && next > 0 && scrollY.value !== 0) {
              scrollTo(scrollRef, 0, 0, false);
            }
          })
          .onEnd((event, success) => {
            if (isClosing.value) return;
            const isDismiss =
              success &&
              shouldDismissSheet({
                offset: offset.value,
                velocityY: event.velocityY,
                sheetHeight,
                canFlickDismiss: !isTouchInContent.value || didStartAtTop.value,
              });
            if (isDismiss) {
              isClosing.value = true;
              scheduleOnRN(fireDismissHaptic);
              animateClose(event.velocityY);
              return;
            }
            if (offset.value <= 0) {
              if (didMoveSheet.value) scheduleOnRN(notifyDragEnd);
              return;
            }
            offset.value = withSpring(
              0,
              { ...SHEET_SPRING, velocity: event.velocityY },
              (finished) => {
                if (finished) scheduleOnRN(notifyDragEnd);
              },
            );
          }),
      [
        animateClose,
        contentBottom,
        contentTop,
        didMoveSheet,
        didStartAtTop,
        dragOrigin,
        fireDismissHaptic,
        isClosing,
        isTouchInContent,
        notifyDragEnd,
        chartContentY,
        chartHeight,
        notifyDragStart,
        offset,
        scrollGesture,
        scrollRef,
        scrollY,
        sheetHeight,
        touchClaim,
        touchInChart,
        touchStartX,
        touchStartY,
      ],
    );

    const chartFrame = useMemo(
      () => ({
        hostRef: sheetHostRef,
        contentY: chartContentY,
        height: chartHeight,
        scrollY,
        gestures: [scrollGesture],
      }),
      [chartContentY, chartHeight, scrollGesture, scrollY],
    );

    const overlayStyle = useAnimatedStyle(() => ({
      opacity:
        fade.value *
        interpolate(
          offset.value,
          [0, sheetHeight],
          [1, 0],
          Extrapolation.CLAMP,
        ),
    }));

    const sheetStyle = useAnimatedStyle(() => ({
      opacity: fade.value,
      transform: [{ translateY: offset.value }],
    }));

    return (
      <View
        style={tw.style('absolute inset-0')}
        pointerEvents="box-none"
        testID={testID}
      >
        <Animated.View
          style={[
            tw.style('absolute inset-0 bg-overlay-default'),
            overlayStyle,
          ]}
        >
          <Pressable
            style={tw.style('flex-1')}
            onPress={dismiss}
            accessible={false}
            testID={PositionDetailsSheetSelectorsIDs.OVERLAY}
          />
        </Animated.View>
        <GestureDetector gesture={dragGesture}>
          <Animated.View
            ref={sheetHostRef}
            accessibilityViewIsModal
            onAccessibilityEscape={dismiss}
            style={[
              tw.style(
                'absolute inset-x-0 bottom-0 bg-elevated1 rounded-t-[32px] overflow-hidden border border-muted border-b-0',
              ),
              { height: sheetHeight, paddingBottom },
              shadow,
              sheetStyle,
            ]}
          >
            <Box
              twClassName="self-stretch items-center p-1"
              testID={PositionDetailsSheetSelectorsIDs.HANDLE}
            >
              <Box twClassName="h-1 w-10 rounded-sm bg-border-muted" />
            </Box>
            {header}
            <GestureDetector gesture={scrollGesture}>
              <Animated.ScrollView
                ref={scrollRef}
                style={tw.style('flex-1')}
                contentContainerStyle={tw.style('grow')}
                onScroll={scrollHandler}
                onLayout={handleScrollLayout}
                scrollEventThrottle={16}
                bounces
                alwaysBounceVertical
                overScrollMode="auto"
                decelerationRate="normal"
                directionalLockEnabled
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                testID={PositionDetailsSheetSelectorsIDs.SCROLL}
              >
                <SheetChartFrameContext.Provider value={chartFrame}>
                  <SheetScrollViewportContext.Provider
                    value={scrollViewportHeight}
                  >
                    {children}
                  </SheetScrollViewportContext.Provider>
                </SheetChartFrameContext.Provider>
              </Animated.ScrollView>
            </GestureDetector>
            {footer}
          </Animated.View>
        </GestureDetector>
      </View>
    );
  },
);

PositionSheetContainer.displayName = 'PositionSheetContainer';

export default PositionSheetContainer;
