import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
  Image,
  Text,
} from 'react-native';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';
import { useTheme } from '../../../util/theme';

/* eslint-disable import/no-commonjs */
const SliderBgImg = require('./assets/slider_button_gradient.png');
const SliderShineImg = require('./assets/slider_button_shine.png');
/* eslint-enable import/no-commonjs */

const DIAMETER = 60;
const MARGIN = DIAMETER * 0.16;
const COMPLETE_VERTICAL_THRESHOLD = DIAMETER * 2;
const COMPLETE_THRESHOLD = 0.85;

const createStyles = (colors, shadows) =>
  StyleSheet.create({
    container: {
      ...shadows.size.sm,
      shadowColor: colors.primary.shadow,
      elevation: 0, // shadow colors not supported on Android. nothing > gray shadow
    },
    disabledContainer: {
      opacity: 0.66,
    },
    slider: {
      position: 'absolute',
      width: DIAMETER,
      height: DIAMETER,
      borderRadius: DIAMETER,
      borderWidth: MARGIN,
      borderColor: colors.primary.alternative,
      backgroundColor: colors.primary.inverse,
    },
    trackBack: {
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      height: DIAMETER,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: DIAMETER,
      backgroundColor: colors.primary.alternative,
    },
    trackBackGradient: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    trackBackGradientPressed: {
      opacity: 0.66,
    },
    trackBackShine: {
      position: 'absolute',
      height: '200%',
      left: 0,
    },
    trackFront: {
      position: 'absolute',
      overflow: 'hidden',
      height: '100%',
      borderRadius: DIAMETER,
    },

    textFrontContainer: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    textBack: {
      ...fontStyles.normal,
      color: colors.primary.inverse,
      fontSize: 16,
    },
    textFront: {
      ...fontStyles.normal,
      color: colors.primary.inverse,
      fontSize: 16,
    },
  });

function SliderButton({
  incompleteText,
  completeText,
  onComplete,
  disabled,
  onSwipeChange,
}) {
  const [componentWidth, setComponentWidth] = useState(0);
  const [hasCompletedCalled, setHasCompletedCalled] = useState(false);
  const [hasStartedCompleteAnimation, setHasStartedCompleteAnimation] =
    useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const shineOffset = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY(0, 0)).current;
  const completion = useRef(new Animated.Value(0)).current;

  const onCompleteCallback = useRef(onComplete);

  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);

  const handleIsPressed = useCallback(
    (isPressed) => {
      onSwipeChange?.(isPressed);
      setIsPressed(isPressed);
    },
    [onSwipeChange],
  );

  const sliderPosition = useMemo(
    () =>
      pan.x.interpolate({
        inputRange: [0, Math.max(componentWidth - DIAMETER, 0)],
        outputRange: [0, componentWidth - DIAMETER],
        extrapolate: 'clamp',
      }),
    [componentWidth, pan.x],
  );

  const incompleteTextOpacity = sliderPosition.interpolate({
    inputRange: [0, Math.max(componentWidth - DIAMETER, 0)],
    outputRange: [1, 0],
  });
  const shineOpacity = disabled
    ? 0
    : incompleteTextOpacity.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
        // eslint-disable-next-line no-mixed-spaces-and-tabs
      });
  const sliderCompletedOpacity = completion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const trackFrontBackgroundColor = completion.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary.alternative, colors.success.default],
  });

  useEffect(() => {
    onCompleteCallback.current = onComplete;
  }, [onComplete, onCompleteCallback]);

  const startCompleteAnimation = useCallback(() => {
    if (!hasStartedCompleteAnimation) {
      setHasStartedCompleteAnimation(true);
      Animated.parallel([
        Animated.spring(completion, {
          toValue: 1,
          useNativeDriver: false,
          isInteraction: false,
        }),
        Animated.spring(pan, {
          toValue: { x: componentWidth, y: 0 },
          useNativeDriver: false,
          isInteraction: false,
        }),
      ]).start(() => {
        if (onCompleteCallback.current && !hasCompletedCalled) {
          setHasCompletedCalled(true);
          onCompleteCallback.current?.();
        }
      });
    }
  }, [
    completion,
    componentWidth,
    hasCompletedCalled,
    hasStartedCompleteAnimation,
    onCompleteCallback,
    pan,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && !hasCompletedCalled,
        onMoveShouldSetPanResponder: () => !disabled && !hasCompletedCalled,
        onPanResponderGrant: () => handleIsPressed(true),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderTerminate: () => {
          handleIsPressed(false);
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        },
        onPanResponderRelease: (evt, gestureState) => {
          handleIsPressed(false);
          if (
            Math.abs(gestureState.dy) < COMPLETE_VERTICAL_THRESHOLD &&
            gestureState.dx / (componentWidth - DIAMETER) >= COMPLETE_THRESHOLD
          ) {
            startCompleteAnimation();
          } else {
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [
      componentWidth,
      disabled,
      handleIsPressed,
      hasCompletedCalled,
      pan,
      startCompleteAnimation,
    ],
  );

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shineOffset, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
          isInteraction: false,
        }),
        Animated.timing(shineOffset, {
          toValue: 100,
          duration: 2000,
          useNativeDriver: false,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [shineOffset]);

  return (
    <View
      style={[styles.container, disabled && styles.disabledContainer]}
      onLayout={(e) => {
        setComponentWidth(e.nativeEvent.layout.width);
      }}
    >
      <View style={styles.trackBack}>
        <Image
          style={[
            styles.trackBackGradient,
            isPressed && styles.trackBackGradientPressed,
          ]}
          source={SliderBgImg}
          resizeMode="stretch"
        />
        {!Device.isAndroid() && (
          <Animated.Image
            style={[
              styles.trackBackShine,
              {
                opacity: shineOpacity,
                transform: [
                  {
                    translateX: shineOffset.interpolate({
                      inputRange: [0, 100],
                      outputRange: [-142, componentWidth + 142],
                    }),
                  },
                ],
              },
            ]}
            source={SliderShineImg}
            resizeMode={'contain'}
          />
        )}
        <Animated.View
          style={{
            opacity: incompleteTextOpacity,
          }}
        >
          <Text style={styles.textBack}>{incompleteText}</Text>
        </Animated.View>
      </View>
      <Animated.View
        style={[
          styles.trackFront,
          {
            backgroundColor: trackFrontBackgroundColor,
            width: Animated.add(sliderPosition, DIAMETER),
          },
        ]}
      >
        <View style={[styles.textFrontContainer, { width: componentWidth }]}>
          <Text style={styles.textFront}>{completeText}</Text>
        </View>
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.slider,
          {
            opacity: sliderCompletedOpacity,
            transform: [{ translateX: sliderPosition }],
          },
        ]}
      />
    </View>
  );
}

SliderButton.propTypes = {
  /**
   * Text that prompts the user to interact with the slider
   */
  incompleteText: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
  /**
   * Text during ineraction stating the action being taken
   */
  completeText: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
  /**
   * Action to execute once button completes sliding
   */
  onComplete: PropTypes.func,
  /**
   * Callback that gets called when the button is being swiped
   */
  onSwipeChange: PropTypes.func,
  /**
   * Value that decides whether or not the slider is disabled
   */
  disabled: PropTypes.bool,
};

export default SliderButton;
