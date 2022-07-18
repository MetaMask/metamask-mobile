/* eslint-disable */
import React, {
  useEffect,
  ReactNode,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Dimensions,
  StyleProp,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  call,
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
} from 'react-native-reanimated';
import {
  onGestureEvent,
  withSpring,
  clamp,
  timing,
} from 'react-native-redash/src/v1';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';
const screenHeight = Dimensions.get('window').height;

type DismissModalCallback = () => void;

export interface ReusableModalRef {
  dismissModal: (callback?: DismissModalCallback) => void;
}

interface Props {
  ref?: React.Ref<ReusableModalRef>;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  onDismiss?: (hasPendingAction: boolean) => void;
}

const ReusableModal = forwardRef<ReusableModalRef, Props>((props, ref) => {
  const { style, children, onDismiss } = props;
  const topOffset = 0;
  const bottomOffset = screenHeight;
  const navigation = useNavigation();
  const safeAreaInsets = useSafeAreaInsets();
  const trigger = useRef<DismissModalCallback>();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Animation config
  const animationConfig: Omit<Animated.SpringConfig, 'toValue'> = {
    damping: 100,
    overshootClamping: false,
    restSpeedThreshold: 5,
    restDisplacementThreshold: 5,
    stiffness: 800,
    mass: 6,
  };

  // Animation is finished, process end state
  const triggerDismissed = useCallback(() => {
    // Remove modal from stack
    navigation.goBack();
    // Declaratively
    onDismiss && onDismiss(!!trigger.current);
    // Imperatively
    trigger.current && trigger.current();
  }, [onDismiss]);

  // Set up gesture handler
  const offset = useMemo(() => new Value(bottomOffset), []);
  const state = useMemo(() => new Value(State.UNDETERMINED), []);
  const velocityY = useMemo(() => new Value(0), []);
  const translationY = useMemo(() => new Value(0), []);
  const gestureHandler = useMemo(
    () => onGestureEvent({ translationY, state, velocityY }),
    [],
  );
  const clock = useMemo(() => new Animated.Clock(), []);
  const translateY = useMemo(
    () =>
      clamp(
        withSpring({
          onSnap: (val) => {
            const offset = val[0];
            if (offset == bottomOffset) {
              // TODO: Use optional chaining once prettier is fixed
              triggerDismissed();
            }
          },
          state,
          velocity: velocityY,
          offset,
          value: translationY,
          snapPoints: [topOffset, bottomOffset],
          config: animationConfig,
        }),
        topOffset,
        bottomOffset,
      ),
    [bottomOffset, topOffset, translationY, velocityY, triggerDismissed],
  );

  // Programatically trigger hiding and showing
  const triggerShowModal: Animated.Value<0 | 1> = useMemo(
    () => new Value(0),
    [],
  );
  const triggerDismissModal: Animated.Value<0 | 1> = useMemo(
    () => new Value(0),
    [],
  );

  // Dismiss overlay
  const dismissOverlay = useCallback(() => {
    triggerDismissModal.setValue(1);
  }, [triggerDismissModal]);

  // Define animated styles
  const animatedStyles: StyleSheet.NamedStyles<any> = useMemo(() => {
    return {
      overlayBackground: {
        opacity: interpolateNode(translateY, {
          inputRange: [topOffset, bottomOffset],
          outputRange: [1, 0],
        }) as any,
      },
      overlayBackgroundTouchable: {
        ...StyleSheet.absoluteFillObject,
        transform: [
          {
            translateY: interpolateNode(translateY, {
              inputRange: [0, 1],
              outputRange: [0, bottomOffset],
            }) as any,
          },
        ],
      },
      modal: {
        transform: [{ translateY } as any],
        // TODO: This could be used to handle universal safe area bottom padding
        // paddingBottom: safeAreaInsets.bottom
        flex: 1,
      },
    };
  }, [topOffset, bottomOffset, translateY, safeAreaInsets]);

  // Declarative logic that animates overlay
  useCode(
    () =>
      block([
        // Animate IN overlay
        cond(eq(triggerShowModal, new Value(1)), [
          set(
            offset,
            timing({
              clock,
              from: offset,
              easing: EasingNode.inOut(EasingNode.ease) as any,
              duration: 250,
              to: topOffset,
            }),
          ),
          // Reset value that toggles animating in overlay
          cond(not(clockRunning(clock)), block([set(triggerShowModal, 0)])),
        ]),
        // Animate OUT overlay
        cond(eq(triggerDismissModal, new Value(1)), [
          set(
            offset,
            timing({
              clock,
              from: offset,
              easing: EasingNode.inOut(EasingNode.ease) as any,
              duration: 200,
              to: bottomOffset,
            }),
          ),
          // Dismiss overlay after animating out
          cond(
            not(clockRunning(clock)),
            block([
              call([], () => triggerDismissed()),
              set(triggerDismissModal, 0),
            ]),
          ),
        ]),
      ]),
    [],
  );

  // Show modal
  useEffect(() => {
    triggerShowModal.setValue(1);
  }, []);

  // Expose actions for external components
  useImperativeHandle(ref, () => ({
    dismissModal: (callback) => {
      trigger.current = callback;
      dismissOverlay();
    },
  }));

  const renderOverlay = useCallback(() => {
    return (
      <Animated.View
        style={[styles.overlayBackground, animatedStyles.overlayBackground]}
      />
    );
  }, [animatedStyles, styles]);

  const renderContent = useCallback(() => {
    return (
      <PanGestureHandler {...gestureHandler}>
        <Animated.View style={[animatedStyles.modal, style]}>
          <Animated.View style={animatedStyles.overlayBackgroundTouchable}>
            <TouchableOpacity style={styles.fill} onPress={dismissOverlay} />
          </Animated.View>
          {children}
        </Animated.View>
      </PanGestureHandler>
    );
  }, [gestureHandler, animatedStyles, style, children, dismissOverlay]);

  return (
    <View style={styles.container}>
      {renderOverlay()}
      {renderContent()}
    </View>
  );
});

export default ReusableModal;
