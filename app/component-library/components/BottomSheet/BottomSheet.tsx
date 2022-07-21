/* eslint-disable react/prop-types */
import { useNavigation } from '@react-navigation/native';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import {
  LayoutAnimation,
  LayoutChangeEvent,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '../../hooks';
import styleSheet from './BottomSheet.styles';
import { BottomSheetProps, BottomSheetRef } from './BottomSheet.types';

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ style, children, onDismiss, ...props }, ref) => {
    const { top: screenTopPadding } = useSafeAreaInsets();
    const { height: screenHeight } = useWindowDimensions();

    const { styles } = useStyles(styleSheet, {
      style,
      maxSheetHeight: screenHeight - screenTopPadding,
    });
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
    const navigation = useNavigation();

    useEffect(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [children]);

    const onHide = () => {
      navigation.goBack();
      onDismiss?.();
    };

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
        } else if (hasReachedDismissOffset) {
          finalOffset = sheetHeight.value;
        } else {
          finalOffset = defaultYOffset.value;
        }

        const isDismissed = finalOffset === sheetHeight.value;

        yOffset.value = withTiming(
          finalOffset,
          { duration: 200 },
          () => isDismissed && runOnJS(onHide)(),
        );
      },
    });

    const show = () => {
      yOffset.value = withTiming(0, { duration: 300 });
    };

    const hide = () => {
      yOffset.value = withTiming(sheetHeight.value, { duration: 300 }, () =>
        runOnJS(onHide)(),
      );
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
      // eslint-disable-next-line
      [styles.overlay],
    );

    return (
      <View style={styles.base} {...props}>
        <Animated.View style={combinedOverlayStyle}>
          <TouchableOpacity style={styles.fill} onPress={hide} />
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
