/* eslint-disable react/prop-types */

// Third party dependencies.
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
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
import { useStyles } from '../../../hooks';

// Internal dependencies.
import {
  DEFAULT_BOTTOMSHEETCONTENT_DISPLAY_DURATION,
  DEFAULT_BOTTOMSHEETCONTENT_SWIPE_DURATION,
  DEFAULT_BOTTOMSHEETCONTENT_DISMISSTHRESHOLD,
  DEFAULT_BOTTOMSHEETCONTENT_SWIPETHRESHOLD_DURATION,
  DEFAULT_BOTTOMSHEETCONTENT_MARGINTOP,
} from './BottomSheetContent.constants';
import styleSheet from './BottomSheetContent.styles';
import {
  BottomSheetContentPostCallback,
  BottomSheetContentProps,
  BottomSheetContentRef,
} from './BottomSheetContent.types';

const BottomSheetContent = forwardRef<
  BottomSheetContentRef,
  BottomSheetContentProps
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
    const postCallback = useRef<BottomSheetContentPostCallback>();
    const { top: screenTopPadding, bottom: screenBottomPadding } =
      useSafeAreaInsets();
    const { height: screenHeight } = useWindowDimensions();
    const maxSheetHeight = isFullscreen
      ? screenHeight - screenTopPadding
      : screenHeight - screenTopPadding - DEFAULT_BOTTOMSHEETCONTENT_MARGINTOP;
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
      postCallback.current?.();
    }, [onDismissed]);

    const hide = useCallback(() => {
      currentYOffset.value = withTiming(
        sheetHeight.value,
        { duration: DEFAULT_BOTTOMSHEETCONTENT_DISPLAY_DURATION },
        () => runOnJS(onHidden)(),
      );
      // Ref values do not affect deps.
      /* eslint-disable-next-line */
    }, [onHidden]);

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
          sheetHeight.value * DEFAULT_BOTTOMSHEETCONTENT_DISMISSTHRESHOLD;
        const hasReachedSwipeThreshold =
          Math.abs(velocityY) >
          DEFAULT_BOTTOMSHEETCONTENT_SWIPETHRESHOLD_DURATION;
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

        currentYOffset.value = withTiming(
          finalOffset,
          { duration: DEFAULT_BOTTOMSHEETCONTENT_SWIPE_DURATION },
          () => isDismissed && runOnJS(onHidden)(),
        );
      },
    });

    // Animate in sheet on initial render.
    const show = (initialSheetHeight: number) => {
      currentYOffset.value = initialSheetHeight;
      currentYOffset.value = withTiming(visibleYOffset.value, {
        duration: DEFAULT_BOTTOMSHEETCONTENT_DISPLAY_DURATION,
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
        show(height);
      }
    };

    useImperativeHandle(ref, () => ({
      hide: (callback) => {
        postCallback.current = callback;
        debouncedHide();
      },
    }));

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

export default BottomSheetContent;
