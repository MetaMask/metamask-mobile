/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useMemo, useRef } from 'react';
import {
  // LayoutAnimation,
  LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  SlideInDown,
  SlideOutDown,
  useAnimatedGestureHandler,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './BottomSheetContent.styles';
import { BottomSheetContentProps } from './BottomSheetContent.types';

const BottomSheetContent: React.FC<BottomSheetContentProps> = ({
  style,
  children,
  isFullscreen = false,
  isInteractable = true,
  onDismissed,
}) => {
  const { styles } = useStyles(styleSheet, { style, isFullscreen });

  const { height: screenHeight } = useWindowDimensions();
  const currentYOffset = useSharedValue(screenHeight);
  const visibleYOffset = useSharedValue(0);
  const sheetHeight = useSharedValue(screenHeight);
  const isMounted = useRef(false);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startY: number }
  >({
    onStart: (_, ctx) => {
      // Setting the current Y offset or vertical distance of the BottomSheetContent.
      ctx.startY = currentYOffset.value;
    },
    onActive: (event, ctx) => {
      // Vertical distance that the user has dragged the BottomSheetContent.
      const { translationY } = event;
      currentYOffset.value = ctx.startY + translationY;
      // Set min and max value for currentYOffset in case it goes out of bound.
      if (currentYOffset.value >= sheetHeight.value) {
        currentYOffset.value = sheetHeight.value;
      }
      if (currentYOffset.value <= visibleYOffset.value) {
        currentYOffset.value = visibleYOffset.value;
      }
    },
    onEnd: (event, ctx) => {
      // Vertical distance and vertical speed the user has dragged the BottomSheetContent.
      const { translationY, velocityY } = event;
      let finalOffset: number;
      const latestOffset = ctx.startY + translationY;
      const hasReachedDismissOffset = latestOffset > sheetHeight.value * 0.6;
      const hasReachedSwipeThreshold = Math.abs(velocityY) > 300;
      const isDismissing = velocityY > 0;

      // If the user's swipe has reached predetermined threshold.
      if (hasReachedSwipeThreshold) {
        if (isDismissing) {
          // Set yOffset to
          finalOffset = sheetHeight.value;
        } else {
          // Return yOffset to BottomSheetContent height
          finalOffset = visibleYOffset.value;
        }
      } else if (hasReachedDismissOffset) {
        // Set yOffset to
        finalOffset = sheetHeight.value;
      } else {
        // Return yOffset to BottomSheetContent height
        finalOffset = visibleYOffset.value;
      }

      // Checking if final offset is at the bottom
      const isDismissed = finalOffset === sheetHeight.value;

      currentYOffset.value = finalOffset;
      if (isDismissed) {
        onDismissed?.();
      }
    },
  });

  const updateSheetHeight = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    sheetHeight.value = height;
    console.log(sheetHeight.value);
    if (!isMounted.current) {
      isMounted.current = true;
    }
  };

  const animatedSheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  const combinedSheetStyle = useMemo(
    () => [styles.base, animatedSheetStyle],
    // eslint-disable-next-line
    [styles.base],
  );

  return (
    <PanGestureHandler enabled={isInteractable} onGestureEvent={gestureHandler}>
      <Animated.View
        entering={SlideInDown.duration(300)}
        exiting={SlideOutDown.duration(300)}
        onLayout={updateSheetHeight}
        style={styles.base}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
};

export default BottomSheetContent;
