/* eslint-disable react/prop-types */

// Third party dependencies.
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useImperativeHandle,
} from 'react';
import {
  LayoutChangeEvent,
  View,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
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

/**
 * @deprecated Please update your code to use `BottomSheetDialog` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/BottomSheetDialog/README.md}
 * @since @metamask/design-system-react-native@0.11.0
 */
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
    const gestureStartY = useSharedValue(0);
    const isMounted = useRef(false);
    const isClosingRef = useRef(false);

    const onOpenCB = useCallback(() => {
      onOpen?.();
    }, [onOpen]);
    const onCloseCB = useCallback(() => {
      onClose?.();
    }, [onClose]);

    const onCloseDialog = useCallback(() => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      currentYOffset.value = withTiming(
        bottomOfDialogYValue.value,
        { duration: DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION },
        () => runOnJS(onCloseCB)(),
      );
      // Ref values do not affect deps.
      /* eslint-disable-next-line */
    }, [onCloseCB]);

    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .enabled(isInteractable)
          .onStart(() => {
            'worklet';
            gestureStartY.value = currentYOffset.value;
          })
          .onUpdate((event) => {
            'worklet';
            currentYOffset.value = gestureStartY.value + event.translationY;
            if (currentYOffset.value >= bottomOfDialogYValue.value) {
              currentYOffset.value = bottomOfDialogYValue.value;
            }
            if (currentYOffset.value <= topOfDialogYValue.value) {
              currentYOffset.value = topOfDialogYValue.value;
            }
          })
          .onEnd((event) => {
            'worklet';
            const { translationY, velocityY } = event;
            let finalYOffset: number;
            const latestOffset = gestureStartY.value + translationY;
            const hasReachedDismissOffset =
              latestOffset >
              bottomOfDialogYValue.value *
                DEFAULT_BOTTOMSHEETDIALOG_DISMISSTHRESHOLD;
            const hasReachedSwipeThreshold =
              Math.abs(velocityY) >
              DEFAULT_BOTTOMSHEETDIALOG_SWIPETHRESHOLD_DURATION;
            const isQuickDismissing = velocityY > 0;

            if (hasReachedSwipeThreshold) {
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
              currentYOffset.value = withTiming(finalYOffset, {
                duration: DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION,
              });
            }
          }),
      // Shared values are stable refs; worklets read .value at runtime.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [isInteractable, onCloseDialog],
    );

    // Animate in sheet on initial render.
    const onOpenDialog = () => {
      isClosingRef.current = false;
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
        <GestureDetector gesture={panGesture}>
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
        </GestureDetector>
      </KeyboardAvoidingView>
    );
  },
);

export default BottomSheetDialog;
