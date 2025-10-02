/* eslint-disable react/prop-types */

// Third party dependencies.
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useImperativeHandle,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  View,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { debounce } from 'lodash';

// External dependencies.
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import {
  DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION,
  DEFAULT_BOTTOMSHEETDIALOG_DISMISSTHRESHOLD,
  DEFAULT_BOTTOMSHEETDIALOG_SWIPETHRESHOLD_DURATION,
} from './BottomSheetDialog.constants';
import styleSheet from './BottomSheetDialog.styles';
import {
  BottomSheetDialogRef,
  BottomSheetDialogProps,
} from './BottomSheetDialog.types';

const BottomSheetDialog = forwardRef<
  BottomSheetDialogRef,
  BottomSheetDialogProps
>(
  (
    {
      children,
      isFullscreen = false,
      isInteractable = true,
      keyboardAvoidingViewEnabled = true,
      onClose,
      onOpen,
      style,
      ...props
    },
    ref,
  ) => {
    const { top: screenTopPadding, bottom: screenBottomPadding } =
      useSafeAreaInsets();
    const { y: frameY, height: screenHeight } = useSafeAreaFrame();

    const maxSheetHeight = screenHeight - screenTopPadding;
    const { styles } = useStyles(styleSheet, {
      maxSheetHeight,
      screenBottomPadding,
      style,
      isFullscreen,
    });
    // X and Y values start on top left of the DIALOG
    // currentYOffset will be used to animate the Y position of the Dialog
    const currentYOffset = useSharedValue(screenHeight);
    const topOfDialogYValue = useSharedValue(0);
    const bottomOfDialogYValue = useSharedValue(screenHeight);
    const isMounted = useRef(false);
    const [isDismissing, setIsDismissing] = useState(false);

    const onOpenCB = useCallback(() => {
      onOpen?.();
    }, [onOpen]);
    const onCloseCB = useCallback(() => {
      onClose?.();
    }, [onClose]);

    const onCloseDialog = useCallback(() => {
      // Guard against multiple dismiss calls during rapid taps
      if (isDismissing) return;
      setIsDismissing(true);

      currentYOffset.value = withTiming(
        bottomOfDialogYValue.value,
        { duration: DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION },
        () => {
          runOnJS(onCloseCB)();
          // Reset guard after animation completes
          runOnJS(setIsDismissing)(false);
        },
      );
      // isDismissing is intentionally excluded from deps to prevent callback recreation
      // which would defeat the debounce protection. It's a guard, not a dependency.
      // Ref values (currentYOffset, bottomOfDialogYValue) do not affect deps.
      /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [onCloseCB]);

    const gestureHandler = useAnimatedGestureHandler<
      PanGestureHandlerGestureEvent,
      { startY: number }
    >({
      onStart: (_, ctx) => {
        // Starts tracking vertical position of gesture
        ctx.startY = currentYOffset.value;
      },
      onActive: (event, ctx) => {
        const { translationY } = event;
        currentYOffset.value = ctx.startY + translationY;
        // If gesture Y value goes above the bottom of Dialog Y value(bottom of dialog),
        // which means the gesture is currently below the bottom of the dialog,
        // sets it to bottom of Dialog Y value
        if (currentYOffset.value >= bottomOfDialogYValue.value) {
          currentYOffset.value = bottomOfDialogYValue.value;
        }
        // If gesture Y value goes below the top of Dialog Y value(top of dialog),
        // which means the gesture is currently above the top of the dialog,
        // sets it to top of Dialog Y value
        if (currentYOffset.value <= topOfDialogYValue.value) {
          currentYOffset.value = topOfDialogYValue.value;
        }
      },
      onEnd: (event, ctx) => {
        const { translationY, velocityY } = event;
        // finalYOffset is used to animate the Y position of the Dialog after the gesture event
        let finalYOffset: number;
        // Measuring dismissing swipe action
        const latestOffset = ctx.startY + translationY;
        // Check if the swipe distance reach the dismiss offset threshold,
        // which is currently 60% of sheet height
        const hasReachedDismissOffset =
          latestOffset >
          bottomOfDialogYValue.value *
            DEFAULT_BOTTOMSHEETDIALOG_DISMISSTHRESHOLD;
        // Check if the gesture's vertical speed has reached the threshold to determine a swipe action
        const hasReachedSwipeThreshold =
          Math.abs(velocityY) >
          DEFAULT_BOTTOMSHEETDIALOG_SWIPETHRESHOLD_DURATION;
        const isQuickDismissing = velocityY > 0;

        // If user is swiping
        if (hasReachedSwipeThreshold) {
          // Quick swipe takes priority
          if (isQuickDismissing) {
            finalYOffset = bottomOfDialogYValue.value;
          } else {
            finalYOffset = topOfDialogYValue.value;
          }
        } else if (hasReachedDismissOffset) {
          finalYOffset = bottomOfDialogYValue.value;
        } else {
          finalYOffset = topOfDialogYValue.value;
        }

        const isDismissed = finalYOffset === bottomOfDialogYValue.value;

        if (isDismissed) {
          runOnJS(onCloseDialog)();
        } else {
          // Only animate dialog to a certain Y position instead
          currentYOffset.value = withTiming(finalYOffset, {
            duration: DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION,
          });
        }
      },
    });

    // Animate in sheet on initial render.
    const onOpenDialog = () => {
      // Reset dismissing state when opening
      setIsDismissing(false);
      // Starts setting the Y position of the dialog to the bottom of the dialog
      currentYOffset.value = bottomOfDialogYValue.value;
      // Animate the Y position to the top of the dialog, then call onOpenCB
      currentYOffset.value = withTiming(
        topOfDialogYValue.value,
        {
          duration: DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION,
        },
        () => runOnJS(onOpenCB)(),
      );
    };

    const onDebouncedCloseDialog = useMemo(
      // Prevent hide from being called multiple times. Potentially caused by taps in quick succession.
      // 1000ms = 300ms animation + 700ms buffer for navigation/state changes
      // Conservative timing accounts for low-end device performance (frame drops, slow React Native bridge)
      // Prevents React Navigation stack corruption during rapid sheet changes.
      // 50% improvement over original 2000ms timing while maintaining stability.
      () => debounce(onCloseDialog, 1000, { leading: true }),
      [onCloseDialog],
    );

    useEffect(
      () =>
        // Automatically handles animation when content changes
        // Disable for now since network switches causes the screen to hang with this on.
        // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onDebouncedCloseDialog.cancel(),
      [children, onDebouncedCloseDialog],
    );

    const updateSheetHeight = (e: LayoutChangeEvent) => {
      const { height } = e.nativeEvent.layout;
      bottomOfDialogYValue.value = height;

      if (!isMounted.current) {
        isMounted.current = true;
        onOpenDialog();
      }
    };

    const animatedSheetStyle = useAnimatedStyle(() => ({
      transform: [
        {
          translateY: currentYOffset.value,
        },
      ],
    }));

    const combinedSheetStyle = useMemo(
      () => [styles.sheet, animatedSheetStyle],
      // eslint-disable-next-line
      [styles.sheet],
    );

    useImperativeHandle(ref, () => ({
      onOpenDialog,
      onCloseDialog,
    }));

    return (
      <KeyboardAvoidingView
        style={styles.base}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? -screenBottomPadding : frameY
        }
        enabled={keyboardAvoidingViewEnabled}
        {...props}
      >
        <PanGestureHandler
          enabled={isInteractable}
          onGestureEvent={gestureHandler}
        >
          <Animated.View
            onLayout={updateSheetHeight}
            style={combinedSheetStyle}
          >
            {isInteractable && (
              <View style={styles.notchWrapper}>
                <View style={styles.notch} />
              </View>
            )}
            {children}
          </Animated.View>
        </PanGestureHandler>
      </KeyboardAvoidingView>
    );
  },
);

export default BottomSheetDialog;
