/* eslint-disable react/prop-types */

// Third party dependencies.
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

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import {
  DISMISS_DISTANCE_THRESHOLD,
  DISMISS_SWIPE_SPEED_THRESHOLD,
  TAP_TRIGGERED_ANIMATION,
  SWIPE_TRIGGERED_ANIMATION,
} from './SheetBottom.constants';
import styleSheet from './SheetBottom.styles';
import {
  SheetBottomPostCallback,
  SheetBottomProps,
  SheetBottomRef,
} from './SheetBottom.types';

const SheetBottom = forwardRef<SheetBottomRef, SheetBottomProps>(
  ({ children, onDismissed, isInteractable = true, ...props }, ref) => {
    const postCallback = useRef<SheetBottomPostCallback>();
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
      // Sheet is automatically unmounted from the navigation stack.
      navigation.goBack();
      onDismissed?.();
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
          { duration: SWIPE_TRIGGERED_ANIMATION },
          () => isDismissed && runOnJS(onHide)(),
        );
      },
    });

    const hide = () => {
      yOffset.value = withTiming(
        sheetHeight.value,
        { duration: TAP_TRIGGERED_ANIMATION },
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

export default SheetBottom;
