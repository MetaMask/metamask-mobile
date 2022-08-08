/* eslint-disable import/no-extraneous-dependencies, react/display-name, react/display-name, react-hooks/exhaustive-deps, arrow-body-style, react/prop-types */
import React, {
  ReactNode,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Dimensions,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  eq,
  EasingNode,
  not,
  block,
  cond,
  clockRunning,
  Value,
  interpolateNode,
  useCode,
  set,
  Extrapolate,
} from 'react-native-reanimated';
import {
  onGestureEvent,
  withSpring,
  clamp,
  timing,
} from 'react-native-redash/src/v1';
import { useNavigation } from '@react-navigation/native';
const screenWidth = Dimensions.get('window').width;
import DrawerView from '../DrawerView';
import styles from './styles';
import { useTheme } from '../../../util/theme';

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
  const hiddenOffset = -screenWidth;
  const visibleOffset = 0;
  const navigation = useNavigation();
  const safeAreaInsets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Animation config
  const animationConfig: Omit<Animated.SpringConfig, 'toValue'> = {
    damping: 100,
    overshootClamping: false,
    restSpeedThreshold: 5,
    restDisplacementThreshold: 5,
    stiffness: 800,
    mass: 6,
  };

  // Set up gesture handler
  const offset = useMemo(() => new Value(hiddenOffset), []);
  const state = useMemo(() => new Value(State.UNDETERMINED), []);
  const velocityX = useMemo(() => new Value(0), []);
  const translationX = useMemo(() => new Value(0), []);
  const gestureHandler = useMemo(
    () => onGestureEvent({ translationX, state, velocityX }),
    [],
  );
  const clock = useMemo(() => new Animated.Clock(), []);
  const translateX = useMemo(
    () =>
      clamp(
        withSpring({
          // onSnap: (val) => {
          // 	const offset = val[0];
          // 	if (offset == visibleOffset) {
          // 		// TODO: Use optional chaining once prettier is fixed
          // 		triggerDismissed();
          // 	}
          // },
          state,
          velocity: velocityX,
          offset,
          value: translationX,
          snapPoints: [hiddenOffset, visibleOffset],
          config: animationConfig,
        }),
        hiddenOffset,
        visibleOffset,
      ),
    [visibleOffset, hiddenOffset, translationX, velocityX],
  );

  // Programatically trigger hiding and showing
  const triggerShowDrawer: Animated.Value<0 | 1> = useMemo(
    () => new Value(0),
    [],
  );
  const triggerDismissDrawer: Animated.Value<0 | 1> = useMemo(
    () => new Value(0),
    [],
  );

  // Dismiss overlay
  const dismissDrawer = useCallback(() => {
    triggerDismissDrawer.setValue(1);
  }, []);

  // Show overlay
  const showDrawer = useCallback(() => {
    triggerShowDrawer.setValue(1);
  }, []);

  // Define animated styles
  const animatedStyles: StyleSheet.NamedStyles<any> = useMemo(() => {
    return {
      overlayBackground: {
        backgroundColor: colors.overlay.default,
        ...styles.absoluteFill,
        opacity: interpolateNode(translateX, {
          inputRange: [hiddenOffset + 1, visibleOffset],
          outputRange: [0, 1],
        }) as any,
        transform: [
          {
            translateX: interpolateNode(translateX, {
              inputRange: [hiddenOffset, hiddenOffset + 1],
              outputRange: [hiddenOffset, visibleOffset],
              extrapolate: Extrapolate.CLAMP,
            }) as any,
          },
        ],
      },
      overlayBackgroundTouchable: {
        ...StyleSheet.absoluteFillObject,
        transform: [
          {
            translateX: interpolateNode(translateX, {
              inputRange: [visibleOffset - 1, visibleOffset],
              outputRange: [hiddenOffset, visibleOffset],
            }) as any,
          },
        ],
      },
      modal: {
        transform: [{ translateX } as any],
        ...StyleSheet.absoluteFillObject,
      },
    };
  }, [hiddenOffset, visibleOffset, translateX, safeAreaInsets, colors]);

  // Declarative logic that animates overlay
  useCode(
    () =>
      block([
        // Animate IN overlay
        cond(eq(triggerShowDrawer, new Value(1)), [
          set(
            offset,
            timing({
              clock,
              from: offset,
              easing: EasingNode.inOut(EasingNode.ease) as any,
              duration: 250,
              to: visibleOffset,
            }),
          ),
          // Reset value that toggles animating in overlay
          cond(not(clockRunning(clock)), block([set(triggerShowDrawer, 0)])),
        ]),
        // Animate OUT overlay
        cond(eq(triggerDismissDrawer, new Value(1)), [
          set(
            offset,
            timing({
              clock,
              from: offset,
              easing: EasingNode.inOut(EasingNode.ease) as any,
              duration: 200,
              to: hiddenOffset,
            }),
          ),
          // Dismiss overlay after animating out
          cond(not(clockRunning(clock)), block([set(triggerDismissDrawer, 0)])),
        ]),
      ]),
    [],
  );

  // Expose actions for external components
  useImperativeHandle(ref, () => ({
    dismissDrawer: () => dismissDrawer(),
    showDrawer: () => showDrawer(),
  }));

  const renderOverlay = useCallback(() => {
    return <Animated.View style={animatedStyles.overlayBackground} />;
  }, [animatedStyles]);

  const renderContent = useCallback(() => {
    return (
      <PanGestureHandler {...gestureHandler}>
        <Animated.View style={[animatedStyles.modal, style]}>
          <Animated.View style={animatedStyles.overlayBackgroundTouchable}>
            <TouchableOpacity style={styles.fill} onPress={dismissDrawer} />
          </Animated.View>
          <DrawerView navigation={navigation} onCloseDrawer={dismissDrawer} />
        </Animated.View>
      </PanGestureHandler>
    );
  }, [gestureHandler, animatedStyles, style, children, dismissDrawer]);

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
