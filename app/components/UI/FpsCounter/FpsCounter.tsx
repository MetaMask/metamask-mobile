import React, { useMemo } from 'react';
import {
  Dimensions,
  StyleSheet,
  TextInput,
  View,
  Text,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BoxedJsFpsTracking } from 'react-native-performance-toolkit';
import Animated, {
  interpolateColor,
  setNativeProps,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { isE2E } from '../../../util/test/utils';

export const IS_FPS_COUNTER_ENABLED = (() => {
  if (isE2E) {
    // Could break some E2E or performance tests as FPS counter can overlay some UI elements
    return false;
  }
  if (Platform.OS === 'ios') {
    // There is some issue on iOS in RN 0.76.x, disable until we upgrade to newer version
    return false;
  }
  if (__DEV__) {
    // It's useful to know FPS in debug mode
    return true;
  }
  switch (process.env.METAMASK_ENVIRONMENT) {
    case 'rc':
      return true;
    case 'qa':
      return true;
    case 'exp':
      return true;
    default:
      return false;
  }
})();

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOX_WIDTH = 40;
const BOX_HEIGHT = 50;

const styles = StyleSheet.create({
  draggableBox: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    position: 'absolute',
    right: 0,
    top: 100,
  },
  // Pan gesture doesn't work on TextInput so we overlay it with empty view
  draggableBoxOverlay: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 2,
  },
  // eslint-disable-next-line react-native/no-color-literals
  fpsText: {
    color: 'white',
    fontSize: 16,
    padding: 0,
  },
  // eslint-disable-next-line react-native/no-color-literals
  jsFpsText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
  backgroundContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const DraggableView = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    const positionX = useSharedValue(0);
    const positionY = useSharedValue(0);
    const previousPositionX = useSharedValue(0);
    const previousPositionY = useSharedValue(0);

    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .hitSlop(15)
          .onUpdate((e) => {
            positionX.value = previousPositionX.value + e.translationX;
            positionY.value = previousPositionY.value + e.translationY;
          })
          .onEnd((e) => {
            const springConfig = {
              mass: 0.6,
              damping: 12,
              stiffness: 220,
            };

            if (e.absoluteX + BOX_WIDTH / 2 < SCREEN_WIDTH / 2) {
              const newPositionX = (SCREEN_WIDTH - BOX_WIDTH) * -1;
              positionX.value = withSpring(newPositionX, springConfig);
              previousPositionX.value = newPositionX;
            } else {
              positionX.value = withSpring(0, springConfig);
              previousPositionX.value = 0;
            }
            previousPositionY.value = positionY.value;
          }),
      [positionX, positionY, previousPositionX, previousPositionY],
    );

    const style = useAnimatedStyle(() => ({
      transform: [
        { translateX: positionX.value },
        { translateY: positionY.value },
      ],
    }));

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[style, styles.draggableBox]}>
          {children}
          <View style={styles.draggableBoxOverlay} />
        </Animated.View>
      </GestureDetector>
    );
  },
);

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const FpsCounter = React.memo(() => {
  const inputRef = useAnimatedRef<TextInput>();
  const fpsValue = useSharedValue(0);
  const lastUpdateTime = useSharedValue<number>(Date.now());

  useFrameCallback(() => {
    'worklet';
    const now = Date.now();
    if (now - lastUpdateTime.value < 1000) {
      return;
    }
    lastUpdateTime.value = now;

    const unboxedJsFps = BoxedJsFpsTracking.unbox();

    const buffer = unboxedJsFps.getJsFpsBuffer();

    const view = new DataView(buffer);
    fpsValue.value = view.getInt32(0, true);
    setNativeProps(inputRef, { text: fpsValue.value.toString() });
  });

  const animatedBackgroundColor = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      fpsValue.value,
      [0, 60],
      ['red', 'green'],
    ),
  }));

  return (
    <DraggableView>
      <Animated.View
        style={[animatedBackgroundColor, styles.backgroundContainer]}
      >
        <AnimatedTextInput
          ref={inputRef}
          style={styles.fpsText}
          editable={false}
          verticalAlign="middle"
          textAlign="center"
        />
        <Text style={styles.jsFpsText}>JS FPS</Text>
      </Animated.View>
    </DraggableView>
  );
});
