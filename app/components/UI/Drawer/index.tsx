/* eslint-disable import/no-extraneous-dependencies, react/display-name, react/display-name, react-hooks/exhaustive-deps, arrow-body-style, react/prop-types */
import React, {
  ReactNode,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  useWindowDimensions,
  InteractionManager,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

import { useNavigation } from '@react-navigation/native';
import DrawerView from '../DrawerView';
import styles from './styles';
import { useTheme } from '../../../util/theme';
import { useDispatch, useSelector } from 'react-redux';
import { toggleInfoNetworkModal } from '../../../actions/modals';
import { selectChainId } from '../../../selectors/networkController';
import { getIsNetworkOnboarded } from '../../../util/networks';
import Animated, {
  interpolate,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  Extrapolate,
} from 'react-native-reanimated';
/**
 * This indicates that 60% of the sheet needs to be offscreen to meet the distance threshold.
 */
export const DISMISS_DISTANCE_THRESHOLD = 0.3;
/**
 * This number represents the swipe speed to meet the velocity threshold.
 */
export const DISMISS_SWIPE_SPEED_THRESHOLD = 300;
/**
 * The animation duration of the drawer after letting go of a swipe.
 */
export const SWIPE_TRIGGERED_ANIMATION_DURATION = 200;
/**
 * The animation duration used for initial render.
 */
export const INITIAL_RENDER_ANIMATION_DURATION = 350;
/**
 * The animation duration of the drawer after tapping on an action.
 */
export const TAP_TRIGGERED_ANIMATION_DURATION = 300;

interface DrawerRef {
  dismissDrawer: () => void;
  showDrawer: () => void;
}

interface Props {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const Drawer = forwardRef<DrawerRef, Props>((props, ref) => {
  const { style, children } = props;
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const dispatch = useDispatch();

  const prevNetwork = useRef<string>();
  const networkOnboardingState = useSelector(
    (state: any) => state.networkOnboarded.networkOnboardedState,
  );
  const chainId = useSelector(selectChainId);

  useEffect(() => {
    if (prevNetwork.current !== chainId && chainId) {
      if (prevNetwork.current) {
        // Network switched has occured
        // Check if network has been onboarded.
        const networkOnboarded = getIsNetworkOnboarded(
          chainId,
          networkOnboardingState,
        );
        if (!networkOnboarded) {
          InteractionManager.runAfterInteractions(() => {
            dispatch(toggleInfoNetworkModal(true));
          });
        }
      }
      prevNetwork.current = chainId;
    }
  }, [chainId]);

  // Set up gesture handler
  const currentXOffset = useSharedValue(-screenWidth);
  const hiddenOffset = useSharedValue(-screenWidth);
  const visibleXOffset = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
    onStart: (_, ctx) => {
      ctx.startX = currentXOffset.value;
    },
    onActive: (event, ctx) => {
      const { translationX } = event;
      currentXOffset.value = ctx.startX + translationX;
      if (currentXOffset.value >= 0) {
        currentXOffset.value = 0;
      }
      if (currentXOffset.value >= visibleXOffset.value) {
        currentXOffset.value = visibleXOffset.value;
      }
    },
    onEnd: (event, ctx) => {
      const { translationX, velocityX } = event;
      let finalOffset: number;
      const latestOffset = ctx.startX + translationX;

      const hasReachedDismissOffset =
        latestOffset < hiddenOffset.value * DISMISS_DISTANCE_THRESHOLD;
      const hasReachedSwipeThreshold =
        Math.abs(velocityX) > DISMISS_SWIPE_SPEED_THRESHOLD;
      const isDismissing = velocityX < 0;

      if (hasReachedSwipeThreshold) {
        // Quick swipe takes priority
        if (isDismissing) {
          finalOffset = hiddenOffset.value;
        } else {
          finalOffset = visibleXOffset.value;
        }
      } else if (hasReachedDismissOffset) {
        finalOffset = hiddenOffset.value;
      } else {
        finalOffset = visibleXOffset.value;
      }

      // const isDismissed = finalOffset === hiddenOffset.value;

      currentXOffset.value = withTiming(
        finalOffset,
        { duration: SWIPE_TRIGGERED_ANIMATION_DURATION },
        // () => isDismissed && runOnJS(onHidden)(),
      );
    },
  });

  // Dismiss overlay
  const dismissDrawer = useCallback(() => {
    currentXOffset.value = withTiming(hiddenOffset.value, {
      duration: TAP_TRIGGERED_ANIMATION_DURATION,
    });
  }, []);

  // Show overlay
  const showDrawer = useCallback(() => {
    currentXOffset.value = withTiming(visibleXOffset.value, {
      duration: INITIAL_RENDER_ANIMATION_DURATION,
    });
  }, []);

  const animatedOverlayOpacity = useDerivedValue(() =>
    interpolate(
      currentXOffset.value,
      [visibleXOffset.value, hiddenOffset.value],
      [1, 0],
    ),
  );

  const animatedOverlayTranslateX = useDerivedValue(() =>
    interpolate(
      currentXOffset.value,
      [hiddenOffset.value, hiddenOffset.value + 1],
      [hiddenOffset.value, visibleXOffset.value],
      Extrapolate.CLAMP,
    ),
  );

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.default,
    opacity: animatedOverlayOpacity.value,
    transform: [
      {
        translateX: animatedOverlayTranslateX.value,
      },
    ],
  }));

  const animatedTouchableTranslateX = useDerivedValue(() =>
    interpolate(
      currentXOffset.value,
      [visibleXOffset.value - 1, visibleXOffset.value],
      [hiddenOffset.value, 0],
    ),
  );

  const animatedTouchableStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    transform: [
      {
        translateX: animatedTouchableTranslateX.value,
      },
    ],
  }));

  const animatedDrawerStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    transform: [
      {
        translateX: currentXOffset.value,
      },
    ],
  }));

  // Expose actions for external components
  useImperativeHandle(ref, () => ({
    dismissDrawer: () => dismissDrawer(),
    showDrawer: () => showDrawer(),
  }));

  const renderOverlay = useCallback(() => {
    return <Animated.View style={animatedOverlayStyle} />;
  }, []);

  const renderContent = useCallback(() => {
    return (
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[animatedDrawerStyle, style]}>
          <Animated.View style={animatedTouchableStyle}>
            <TouchableOpacity style={styles.fill} onPress={dismissDrawer} />
          </Animated.View>
          <DrawerView navigation={navigation} onCloseDrawer={dismissDrawer} />
        </Animated.View>
      </PanGestureHandler>
    );
  }, [gestureHandler, style, children, dismissDrawer]);

  const renderDrawer = () => {
    return (
      <React.Fragment>
        {renderOverlay()}
        {renderContent()}
      </React.Fragment>
    );
  };

  return (
    <View style={styles.fill}>
      {children}
      {renderDrawer()}
    </View>
  );
});

export default Drawer;
