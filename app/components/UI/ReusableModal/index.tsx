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
import { TouchableOpacity, useWindowDimensions, View } from 'react-native';
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
import { debounce } from 'lodash';

// External dependencies.
import { useStyles } from '../../../component-library/hooks';

// Internal dependencies.
import {
  DISMISS_DISTANCE_THRESHOLD,
  DISMISS_SWIPE_SPEED_THRESHOLD,
  TAP_TRIGGERED_ANIMATION_DURATION,
  SWIPE_TRIGGERED_ANIMATION_DURATION,
  INITIAL_RENDER_ANIMATION_DURATION,
} from './ReusableModal.constants';
import styleSheet from './styles';
import {
  ReusableModalPostCallback,
  ReusableModalProps,
  ReusableModalRef,
} from './ReusableModal.types';
// Export to make compatible with components that use this file.
export type { ReusableModalRef } from './ReusableModal.types';

const ReusableModal = forwardRef<ReusableModalRef, ReusableModalProps>(
  ({ children, onDismiss, isInteractable = true, style, ...props }, ref) => {
    const postCallback = useRef<ReusableModalPostCallback>();
    const { height: screenHeight } = useWindowDimensions();
    const { styles } = useStyles(styleSheet, {});
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
      onDismiss?.(!!postCallback.current);
      postCallback.current?.();
    }, [navigation, onDismiss]);

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

    // Animate in on initial render.
    const show = useCallback(() => {
      currentYOffset.value = screenHeight;
      currentYOffset.value = withTiming(visibleYOffset.value, {
        duration: INITIAL_RENDER_ANIMATION_DURATION,
      });
      // Ref values do not affect deps.
      /* eslint-disable-next-line */
    }, []);

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

    useEffect(() => {
      isMounted.current = true;
      show();
    }, [show]);

    useEffect(() => debouncedHide.cancel(), [children, debouncedHide]);

    useImperativeHandle(ref, () => ({
      dismissModal: (callback) => {
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

    const combinedModalStyle = useMemo(
      () => [styles.absoluteFill, animatedSheetStyle],
      // eslint-disable-next-line
      [styles.absoluteFill],
    );

    return (
      <View style={styles.absoluteFill} {...props}>
        <Animated.View style={combinedOverlayStyle}></Animated.View>
        <PanGestureHandler
          enabled={isInteractable}
          onGestureEvent={gestureHandler}
        >
          <Animated.View style={[combinedModalStyle, style]}>
            <TouchableOpacity
              disabled={!isInteractable}
              style={styles.absoluteFill}
              onPress={debouncedHide}
            />
            {children}
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  },
);

export default ReusableModal;
