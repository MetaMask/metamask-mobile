/* eslint-disable react/prop-types */

// Third party dependencies.
import { useNavigation } from '@react-navigation/native';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  // LayoutAnimation,
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
import { debounce } from 'lodash';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import {
  DISMISS_DISTANCE_THRESHOLD,
  DISMISS_SWIPE_SPEED_THRESHOLD,
  TAP_TRIGGERED_ANIMATION_DURATION,
  SWIPE_TRIGGERED_ANIMATION_DURATION,
  INITIAL_RENDER_ANIMATION_DURATION,
  DEFAULT_MIN_OVERLAY_HEIGHT,
} from './SheetBottom.constants';
import styleSheet from './SheetBottom.styles';
import {
  SheetBottomPostCallback,
  SheetBottomProps,
  SheetBottomRef,
} from './SheetBottom.types';

const SheetBottom = forwardRef<SheetBottomRef, SheetBottomProps>(
  (
    {
      children,
      onDismissed,
      isInteractable = true,
      reservedMinOverlayHeight = DEFAULT_MIN_OVERLAY_HEIGHT,
      ...props
    },
    ref,
  ) => {
    const postCallback = useRef<SheetBottomPostCallback>();
    const { top: screenTopPadding, bottom: screenBottomPadding } =
      useSafeAreaInsets();
    const { height: screenHeight } = useWindowDimensions();
    const { styles } = useStyles(styleSheet, {
      maxSheetHeight:
        screenHeight - screenTopPadding - reservedMinOverlayHeight,
      screenBottomPadding,
    });
    const currentYOffset = useSharedValue(screenHeight);
    const visibleYOffset = useSharedValue(0);
    const sheetHeight = useSharedValue(screenHeight);
    const overlayOpacity = useDerivedValue(() =>
      interpolate(
        currentYOffset.value,
        [visibleYOffset.value, sheetHeight.value],
        [1, 0],
      ),
    );
    const navigation = useNavigation();
    const isMounted = useRef(false);

    const onHidden = useCallback(() => {
      // Sheet is automatically unmounted from the navigation stack.
      navigation.goBack();
      onDismissed?.();
      postCallback.current?.();
    }, [navigation, onDismissed]);

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
          latestOffset > sheetHeight.value * DISMISS_DISTANCE_THRESHOLD;
        const hasReachedSwipeThreshold =
          Math.abs(velocityY) > DISMISS_SWIPE_SPEED_THRESHOLD;
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
          { duration: SWIPE_TRIGGERED_ANIMATION_DURATION },
          () => isDismissed && runOnJS(onHidden)(),
        );
      },
    });

    // Animate in sheet on initial render.
    const show = (initialSheetHeight: number) => {
      currentYOffset.value = initialSheetHeight;
      currentYOffset.value = withTiming(visibleYOffset.value, {
        duration: INITIAL_RENDER_ANIMATION_DURATION,
      });
    };

    const hide = useCallback(() => {
      currentYOffset.value = withTiming(
        sheetHeight.value,
        { duration: TAP_TRIGGERED_ANIMATION_DURATION },
        () => runOnJS(onHidden)(),
      );
      // Ref values do not affect deps.
      /* eslint-disable-next-line */
    }, [onHidden]);

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

    const renderNotch = () => isInteractable && <View style={styles.notch} />;

    return (
      <View style={styles.base} {...props}>
        <Animated.View style={combinedOverlayStyle}>
          <TouchableOpacity
            disabled={!isInteractable}
            style={styles.fill}
            onPress={debouncedHide}
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
