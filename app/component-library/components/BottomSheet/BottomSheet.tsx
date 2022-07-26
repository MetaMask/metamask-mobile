/* eslint-disable react/prop-types */
import { useNavigation } from '@react-navigation/native';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
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
import {
  AUTOMATIC_ANIMATION_DURATION,
  DISMISS_DISTANCE_THRESHOLD,
  DISMISS_SWIPE_SPEED_THRESHOLD,
  MANUAL_ANIMATION_DURATION,
} from './BottomSheet.constants';
import styleSheet from './BottomSheet.styles';
import {
  BottomSheetPostCallback,
  BottomSheetProps,
  BottomSheetRef,
} from './BottomSheet.types';

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ children, onDismiss, isInteractable = true, ...props }, ref) => {
    const postCallback = useRef<BottomSheetPostCallback>();
    const { top: screenTopPadding } = useSafeAreaInsets();
    const { height: screenHeight } = useWindowDimensions();
    const { styles } = useStyles(styleSheet, {
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
      // Automatically handles animation when content changes
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [children]);

    const onHide = () => {
      navigation.goBack();
      onDismiss?.();
      postCallback.current?.();
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
        const hasReachedDismissOffset =
          latestOffset > sheetHeight.value * DISMISS_DISTANCE_THRESHOLD;
        const hasReachedSwipeThreshold =
          Math.abs(velocityY) > DISMISS_SWIPE_SPEED_THRESHOLD;
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
          { duration: AUTOMATIC_ANIMATION_DURATION },
          () => isDismissed && runOnJS(onHide)(),
        );
      },
    });

    const hide = () => {
      yOffset.value = withTiming(
        sheetHeight.value,
        { duration: MANUAL_ANIMATION_DURATION },
        () => runOnJS(onHide)(),
      );
    };

    const updateSheetHeight = (e: LayoutChangeEvent) => {
      const { height } = e.nativeEvent.layout;
      sheetHeight.value = height;
    };

    useImperativeHandle(ref, () => ({
      hide: (callback) => {
        postCallback.current = callback;
        hide();
      },
    }));

    const animatedSheetStyle = useAnimatedStyle(() => ({
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

    const combinedSheetStyle = useMemo(
      () => [styles.sheet, animatedSheetStyle],
      // eslint-disable-next-line
      [styles.sheet],
    );

    const renderNotch = () =>
      isInteractable ? <View style={styles.notch} /> : null;

    return (
      <View style={styles.base} {...props}>
        <Animated.View style={combinedOverlayStyle}>
          <TouchableOpacity
            disabled={!isInteractable}
            style={styles.fill}
            onPress={hide}
          />
        </Animated.View>
        <PanGestureHandler
          enabled={isInteractable}
          onGestureEvent={gestureHandler}
        >
          <Animated.View
            onLayout={updateSheetHeight}
            style={combinedSheetStyle}
          >
            {renderNotch()}
            {children}
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  },
);

export default BottomSheet;
