import {
  Theme,
  usePureBlack,
  useTailwind,
  useTheme,
} from '@metamask/design-system-twrnc-preset';
import { lightTheme, resolveDarkTheme } from '@metamask/design-tokens';
import { debounce } from 'lodash';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  SHEET_DIALOG_CLOSE_DURATION,
  SHEET_DIALOG_CLOSE_EASING,
  SHEET_DIALOG_DRAG_DISMISS_OFFSET,
  SHEET_DIALOG_DRAG_DISMISS_VELOCITY,
  SHEET_DIALOG_DRAG_ELASTIC_DOWN,
  SHEET_DIALOG_OFFSCREEN_FACTOR,
  SHEET_DIALOG_SPRING,
} from './sheetStackMotion';

const sheetCloseEasing = Easing.bezier(
  SHEET_DIALOG_CLOSE_EASING[0],
  SHEET_DIALOG_CLOSE_EASING[1],
  SHEET_DIALOG_CLOSE_EASING[2],
  SHEET_DIALOG_CLOSE_EASING[3],
);

export type QuickBuyBottomSheetDialogProps = {
  children?: React.ReactNode;
  isFullscreen?: boolean;
  isInteractable?: boolean;
  keyboardAvoidingViewEnabled?: boolean;
  onClose?: (hasPendingAction?: boolean) => void;
  /** Fired when dismiss starts (programmatic or drag) — fade backdrop in parallel. */
  onCloseStart?: () => void;
  onOpen?: (hasPendingAction?: boolean) => void;
  twClassName?: string;
} & ViewProps;

export interface QuickBuyBottomSheetDialogRef {
  onCloseDialog: (callback?: () => void) => void;
  onOpenDialog: (callback?: () => void) => void;
}

/**
 * Quick Buy sheet surface — mirrored from DS BottomSheetDialog (PR #1411)
 * until the package ships spring open, tween dismiss, and handle-only drag.
 */
export const QuickBuyBottomSheetDialog = forwardRef<
  QuickBuyBottomSheetDialogRef,
  QuickBuyBottomSheetDialogProps
>(
  (
    {
      children,
      isFullscreen = false,
      isInteractable = true,
      keyboardAvoidingViewEnabled = true,
      onClose,
      onCloseStart,
      onOpen,
      style,
      twClassName,
      ...props
    },
    ref,
  ) => {
    const tw = useTailwind();
    const currentTheme = useTheme();
    const isPureBlack = usePureBlack();
    const shadowLg =
      currentTheme === Theme.Light
        ? lightTheme.shadows.size.lg
        : resolveDarkTheme(isPureBlack).shadows.size.lg;

    const { top: screenTopPadding, bottom: screenBottomPadding } =
      useSafeAreaInsets();
    const { y: frameY, height: screenHeight } = useSafeAreaFrame();

    const maxSheetHeight = screenHeight - screenTopPadding;
    const currentYOffset = useSharedValue(screenHeight);
    const topOfDialogYValue = useSharedValue(0);
    const bottomOfDialogYValue = useSharedValue(screenHeight);
    const gestureStartYOffset = useSharedValue(0);
    const reduceMotion = useSharedValue(false);
    const isMounted = useRef(false);

    useEffect(() => {
      let isActive = true;

      void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
        .then((enabled) => {
          if (isActive) {
            reduceMotion.value = Boolean(enabled);
          }
        })
        .catch(() => {
          // AccessibilityInfo can reject in non-native test environments.
        });

      const subscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        (enabled) => {
          reduceMotion.value = enabled;
        },
      );

      return () => {
        isActive = false;
        subscription?.remove?.();
      };
    }, [reduceMotion]);

    const onOpenCB = useCallback(() => {
      onOpen?.();
    }, [onOpen]);
    const onCloseCB = useCallback(() => {
      onClose?.();
    }, [onClose]);
    const onCloseStartCB = useCallback(() => {
      onCloseStart?.();
    }, [onCloseStart]);

    const onCloseDialog = useCallback(
      (callback?: () => void) => {
        onCloseStartCB();

        const closeConfig = reduceMotion.value
          ? { duration: 0 }
          : {
              duration: SHEET_DIALOG_CLOSE_DURATION,
              easing: sheetCloseEasing,
            };

        currentYOffset.value = withTiming(
          bottomOfDialogYValue.value,
          closeConfig,
          (finished) => {
            if (!finished) {
              return;
            }
            // Reanimated v3 — scheduleOnRN is v4-only.
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- runOnJS is the v3 bridge
            runOnJS(onCloseCB)();
            if (callback) {
              // eslint-disable-next-line @typescript-eslint/no-deprecated -- runOnJS is the v3 bridge
              runOnJS(callback)();
            }
          },
        );
      },
      [
        onCloseCB,
        onCloseStartCB,
        currentYOffset,
        bottomOfDialogYValue,
        reduceMotion,
      ],
    );

    const gestureHandler = useMemo(() => {
      const gesture = Gesture.Pan()
        .enabled(isInteractable)
        .onStart(() => {
          'worklet';
          gestureStartYOffset.value = currentYOffset.value;
        })
        .onUpdate((event) => {
          'worklet';
          const { translationY } = event;
          // Top hard-stop. Downward tracks the finger 1:1.
          if (translationY <= 0) {
            currentYOffset.value = topOfDialogYValue.value;
          } else {
            currentYOffset.value =
              gestureStartYOffset.value +
              translationY * SHEET_DIALOG_DRAG_ELASTIC_DOWN;
          }
        })
        .onEnd((event) => {
          'worklet';
          const { velocityY } = event;
          const dragOffset = currentYOffset.value - topOfDialogYValue.value;
          const shouldDismiss =
            dragOffset > SHEET_DIALOG_DRAG_DISMISS_OFFSET ||
            velocityY > SHEET_DIALOG_DRAG_DISMISS_VELOCITY;

          if (shouldDismiss) {
            // Keep dismiss on the UI thread — avoid a frame stall before tween.
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- runOnJS is the v3 bridge
            runOnJS(onCloseStartCB)();
            const closeConfig = reduceMotion.value
              ? { duration: 0 }
              : {
                  duration: SHEET_DIALOG_CLOSE_DURATION,
                  easing: sheetCloseEasing,
                };
            currentYOffset.value = withTiming(
              bottomOfDialogYValue.value,
              closeConfig,
              (finished) => {
                if (finished) {
                  // eslint-disable-next-line @typescript-eslint/no-deprecated -- runOnJS is the v3 bridge
                  runOnJS(onCloseCB)();
                }
              },
            );
          } else if (reduceMotion.value) {
            currentYOffset.value = withTiming(topOfDialogYValue.value, {
              duration: 0,
            });
          } else {
            currentYOffset.value = withSpring(topOfDialogYValue.value, {
              ...SHEET_DIALOG_SPRING,
              velocity: velocityY,
              reduceMotion: ReduceMotion.System,
            });
          }
        });

      return gesture;
    }, [
      isInteractable,
      currentYOffset,
      gestureStartYOffset,
      topOfDialogYValue,
      bottomOfDialogYValue,
      reduceMotion,
      onCloseStartCB,
      onCloseCB,
    ]);

    const onOpenDialog = (callback?: () => void) => {
      currentYOffset.value = bottomOfDialogYValue.value;

      const onOpened = (finished?: boolean) => {
        if (finished === false) {
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- runOnJS is the v3 bridge
        runOnJS(onOpenCB)();
        if (callback) {
          // eslint-disable-next-line @typescript-eslint/no-deprecated -- runOnJS is the v3 bridge
          runOnJS(callback)();
        }
      };

      if (reduceMotion.value) {
        currentYOffset.value = withTiming(
          topOfDialogYValue.value,
          { duration: 0 },
          onOpened,
        );
      } else {
        currentYOffset.value = withSpring(
          topOfDialogYValue.value,
          {
            ...SHEET_DIALOG_SPRING,
            reduceMotion: ReduceMotion.System,
          },
          onOpened,
        );
      }
    };

    const onDebouncedCloseDialog = useMemo(
      () => debounce(onCloseDialog, 2000, { leading: true }),
      [onCloseDialog],
    );

    useEffect(
      () => onDebouncedCloseDialog.cancel(),
      [children, onDebouncedCloseDialog],
    );

    const updateSheetHeight = (e: LayoutChangeEvent) => {
      const { height } = e.nativeEvent.layout;
      bottomOfDialogYValue.value = height * SHEET_DIALOG_OFFSCREEN_FACTOR;

      if (!isMounted.current) {
        isMounted.current = true;
        onOpenDialog();
      }
    };

    const animatedSheetStyle = useAnimatedStyle(
      () => ({
        transform: [
          {
            translateY: currentYOffset.value,
          },
        ],
      }),
      [],
    );

    const sheetStyle = useMemo(
      () => [
        tw.style(
          isPureBlack ? 'bg-alternative' : 'bg-default',
          'rounded-t-3xl overflow-hidden border border-muted',
          twClassName,
        ),
        {
          maxHeight: maxSheetHeight,
          paddingBottom: Platform.select({
            ios: screenBottomPadding,
            macos: screenBottomPadding,
            default: screenBottomPadding + 16,
          }),
          ...(isFullscreen && { height: maxSheetHeight }),
          ...shadowLg,
        },
        style,
      ],
      [
        tw,
        isPureBlack,
        maxSheetHeight,
        screenBottomPadding,
        isFullscreen,
        shadowLg,
        style,
        twClassName,
      ],
    );

    const combinedSheetStyle = useMemo(
      () => [...sheetStyle, animatedSheetStyle],
      [sheetStyle, animatedSheetStyle],
    );

    useImperativeHandle(ref, () => ({
      onOpenDialog,
      onCloseDialog,
    }));

    return (
      <KeyboardAvoidingView
        style={tw.style('absolute bottom-0 inset-x-0')}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? -screenBottomPadding : frameY
        }
        enabled={keyboardAvoidingViewEnabled}
        {...props}
      >
        <Animated.View onLayout={updateSheetHeight} style={combinedSheetStyle}>
          {isInteractable ? (
            <GestureDetector gesture={gestureHandler}>
              {/* Handle-only drag (PR #1411). 6px pill matches Quick Buy design. */}
              <View
                style={tw.style('self-stretch items-center pt-2 pb-2')}
                testID="quick-buy-drag-handle"
              >
                <View
                  style={tw.style('h-[6px] w-10 rounded-full bg-border-muted')}
                />
              </View>
            </GestureDetector>
          ) : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    );
  },
);

QuickBuyBottomSheetDialog.displayName = 'QuickBuyBottomSheetDialog';
