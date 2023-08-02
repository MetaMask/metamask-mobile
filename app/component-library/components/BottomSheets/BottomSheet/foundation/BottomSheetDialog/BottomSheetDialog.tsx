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
import { LayoutChangeEvent, useWindowDimensions, View } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { debounce } from 'lodash';

// External dependencies.
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import {
  DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION,
  DEFAULT_BOTTOMSHEETDIALOG_DISMISSTHRESHOLD,
  DEFAULT_BOTTOMSHEETDIALOG_SWIPETHRESHOLD_DURATION,
  DEFAULT_BOTTOMSHEETDIALOG_MARGINTOP,
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
      onDismissed,
      ...props
    },
    ref,
  ) => {
    const { top: screenTopPadding, bottom: screenBottomPadding } =
      useSafeAreaInsets();
    const { height: screenHeight } = useWindowDimensions();
    const maxSheetHeight = isFullscreen
      ? screenHeight - screenTopPadding
      : screenHeight - screenTopPadding - DEFAULT_BOTTOMSHEETDIALOG_MARGINTOP;
    const { styles } = useStyles(styleSheet, {
      maxSheetHeight,
      screenBottomPadding,
      isFullscreen,
    });
    const currentYOffset = useSharedValue(screenHeight);
    const visibleYOffset = useSharedValue(0);
    const sheetHeight = useSharedValue(screenHeight);
    const isMounted = useRef(false);

    const onHidden = useCallback(() => {
      onDismissed?.();
    }, [onDismissed]);

    const closeDialog = useCallback(() => {
      currentYOffset.value = withTiming(
        sheetHeight.value,
        { duration: DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION },
        () => runOnJS(onHidden)(),
      );
    }, []);

    const hide = useCallback(() => {
      currentYOffset.value = withTiming(
        sheetHeight.value,
        { duration: DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION },
        () =>
          runOnJS(() => {
            closeDialog();
          }),
      );
      // Ref values do not affect deps.
      /* eslint-disable-next-line */
    }, [onDismissed]);

    const gestureHandler = useAnimatedGestureHandler<
      PanGestureHandlerGestureEvent,
      { startY: number }
    >({
      onStart: (_, ctx) => {
        ctx.startY = currentYOffset.value;
      },
      onActive: (event, ctx) => {
        const { translationY } = event;
        currentYOffset.value = ctx.startY + translationY;
        if (currentYOffset.value >= sheetHeight.value) {
          currentYOffset.value = sheetHeight.value;
        }
        if (currentYOffset.value <= visibleYOffset.value) {
          currentYOffset.value = visibleYOffset.value;
        }
      },
      onEnd: (event, ctx) => {
        const { translationY, velocityY } = event;
        let finalOffset: number;
        const latestOffset = ctx.startY + translationY;
        const hasReachedDismissOffset =
          latestOffset >
          sheetHeight.value * DEFAULT_BOTTOMSHEETDIALOG_DISMISSTHRESHOLD;
        const hasReachedSwipeThreshold =
          Math.abs(velocityY) >
          DEFAULT_BOTTOMSHEETDIALOG_SWIPETHRESHOLD_DURATION;
        const isDismissing = velocityY > 0;

        if (hasReachedSwipeThreshold) {
          // Quick swipe takes priority
          if (isDismissing) {
            finalOffset = sheetHeight.value;
          } else {
            finalOffset = visibleYOffset.value;
          }
        } else if (hasReachedDismissOffset) {
          finalOffset = sheetHeight.value;
        } else {
          finalOffset = visibleYOffset.value;
        }

        const isDismissed = finalOffset === sheetHeight.value;

        if (isDismissed) {
          runOnJS(closeDialog)();
        } else {
          currentYOffset.value = withTiming(finalOffset, {
            duration: DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION,
          });
        }
      },
    });

    // Animate in sheet on initial render.
    const show = () => {
      currentYOffset.value = sheetHeight.value;
      currentYOffset.value = withTiming(visibleYOffset.value, {
        duration: DEFAULT_BOTTOMSHEETDIALOG_DISPLAY_DURATION,
      });
    };

    const debouncedHide = useMemo(
      // Prevent hide from being called multiple times. Potentially caused by taps in quick succession.
      () => debounce(hide, 2000, { leading: true }),
      [hide],
    );

    useEffect(
      () =>
        // Automatically handles animation when content changes
        // Disable for now since network switches causes the screen to hang with this on.
        // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        debouncedHide.cancel(),
      [children, debouncedHide],
    );

    const updateSheetHeight = (e: LayoutChangeEvent) => {
      const { height } = e.nativeEvent.layout;
      sheetHeight.value = height;
      if (!isMounted.current) {
        isMounted.current = true;
        show();
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
      closeDialog: closeDialog,
    }));

    return (
      <View style={styles.base} {...props}>
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
      </View>
    );
  },
);

export default BottomSheetDialog;
