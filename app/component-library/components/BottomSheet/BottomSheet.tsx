/* eslint-disable react/prop-types */
import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import { LayoutChangeEvent, TouchableOpacity, View } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useStyles } from '../../hooks';
import styleSheet from './BottomSheet.styles';
import { BottomSheetProps, BottomSheetRef } from './BottomSheet.types';

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ style, children, ...props }, ref) => {
    const { styles } = useStyles(styleSheet, { style });
    const yOffset = useSharedValue(0);
    const defaultYOffset = useSharedValue(0);
    const sheetHeight = useSharedValue(0);
    const overlayOpacity = useDerivedValue(() =>
      interpolate(
        yOffset.value,
        [defaultYOffset.value, sheetHeight.value],
        [1, 0],
      ),
    );

    const gestureHandler = useAnimatedGestureHandler<
      PanGestureHandlerGestureEvent,
      { startY: number }
    >({
      onStart: (_, ctx) => {
        ctx.startY = yOffset.value;
      },
      onActive: (event, ctx) => {
        const { translationY } = event;
        yOffset.value = ctx.startY + translationY;
        if (yOffset.value >= sheetHeight.value) {
          yOffset.value = sheetHeight.value;
        }
        if (yOffset.value <= defaultYOffset.value) {
          yOffset.value = defaultYOffset.value;
        }
        // console.log(yOffset.value);
      },
      onEnd: (event, ctx) => {
        const { translationY, velocityY } = event;
        let finalOffset: number;
        const latestOffset = ctx.startY + translationY;
        const hasReachedDismissOffset = latestOffset > sheetHeight.value * 0.6;
        const hasReachedSwipeThreshold = Math.abs(velocityY) > 300;
        const isDismissing = velocityY > 0;

        if (hasReachedSwipeThreshold) {
          // Quick swipe takes priority
          if (isDismissing) {
            finalOffset = sheetHeight.value;
          } else {
            finalOffset = defaultYOffset.value;
          }
        } else {
          if (hasReachedDismissOffset) {
            finalOffset = sheetHeight.value;
          } else {
            finalOffset = defaultYOffset.value;
          }
        }

        yOffset.value = withTiming(finalOffset, { duration: 200 }, () => {
          console.log('FINSHED');
        });
      },
      // onCancel: () => {},
      // onFail: () => {},
    });

    const show = () => {
      yOffset.value = withTiming(0, { duration: 300 });
    };

    const hide = () => {
      yOffset.value = withTiming(sheetHeight.value, { duration: 300 });
    };

    const updateSheetHeight = (e: LayoutChangeEvent) => {
      const { height } = e.nativeEvent.layout;
      sheetHeight.value = height;
    };

    useImperativeHandle(ref, () => ({
      show,
      hide,
    }));

    const animatedSheet = useAnimatedStyle(() => ({
      transform: [
        {
          translateY: yOffset.value,
        },
      ],
    }));

    const animatedOverlayStyle = useAnimatedStyle(
      () => ({
        opacity: overlayOpacity.value,
      }),
      [],
    );

    const combinedOverlayStyle = useMemo(
      () => [styles.overlay, animatedOverlayStyle],
      [],
    );

    return (
      <View style={styles.base} {...props}>
        <Animated.View style={combinedOverlayStyle}>
          <TouchableOpacity style={styles.fill} onPress={hide}>
            <TouchableOpacity
              style={{
                height: 50,
                width: 50,
                margin: 50,
                backgroundColor: 'red',
              }}
              onPress={show}
            />
          </TouchableOpacity>
        </Animated.View>
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View
            onLayout={updateSheetHeight}
            style={[styles.sheet, animatedSheet]}
          >
            {children}
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  },
);

export default BottomSheet;
