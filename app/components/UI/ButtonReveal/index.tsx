import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { fontStyles } from '../../../styles/common';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  runOnJS,
  useAnimatedStyle,
  useAnimatedReaction,
  interpolate,
  Extrapolate,
  runOnUI,
} from 'react-native-reanimated';
import { useTheme } from '../../../util/theme';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const radius = 14;
const strokeWidth = 2;
const iconSize = radius - 4;
const innerRadius = radius - strokeWidth / 2;
const circumference = 2 * Math.PI * innerRadius;
const animationDuration = 1200;

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.primary.default,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 99,
    },
    progressContainer: {
      height: radius * 2,
      width: radius * 2,
      marginRight: 12,
    },
    absoluteFillWithCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    absoluteFill: {
      ...StyleSheet.absoluteFillObject,
    },
    preCompletedContainerStyle: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius,
      backgroundColor: colors.primary.default,
    },
    outerCircle: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius,
      backgroundColor: colors.primary.inverse,
    },
    innerCircle: {
      flex: 1,
      borderRadius: radius - strokeWidth,
      margin: strokeWidth,
      backgroundColor: colors.primary.default,
    },
    label: {
      color: colors.primary.inverse,
      fontSize: 18,
      ...(fontStyles.normal as any),
    },
    animatedCircle: {
      transform: [
        {
          rotate: '-90deg',
        },
      ],
    },
  });

interface Props {
  onLongPress: () => void;
  label: string;
}

const ButtonReveal = ({ onLongPress, label }: Props) => {
  // Values for animating the stroke
  const progressOrigin = useSharedValue(innerRadius * 2 * Math.PI);
  const progressDestination = useSharedValue(0);
  const preCompleteControl = useSharedValue(progressOrigin.value);
  // Value for animating the icon & button
  const pressControl = useSharedValue(1);
  // Value for animating the progress container
  const progressContainerOpacity = useSharedValue(1);
  // Value for scaling down the progress container
  const postCompleteControl = useSharedValue(0);
  // Colors
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Animate SVG via props
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: preCompleteControl.value,
  }));

  const resetAnimatedValues = () => {
    'worklet';
    progressOrigin.value = innerRadius * 2 * Math.PI;
    progressDestination.value = 0;
    preCompleteControl.value = innerRadius * 2 * Math.PI;
    pressControl.value = 1;
    postCompleteControl.value = withTiming(
      0,
      {
        duration: 300,
      },
      () => {
        progressContainerOpacity.value = withTiming(1, {
          duration: 150,
        });
      },
    );
  };

  // Reset button to original state
  const resetButton = () =>
    setTimeout(() => {
      runOnUI(resetAnimatedValues)();
    }, 1500);

  // Post animation from long press
  useAnimatedReaction(
    () => preCompleteControl.value,
    (val) => {
      if (val === progressDestination.value) {
        // Trigger post long press animation
        progressContainerOpacity.value = 0;
        postCompleteControl.value = withTiming(1, {
          duration: 400,
        });
        pressControl.value = withTiming(1, {
          duration: 400,
        });
      }
    },
  );

  // Trigger action from long press
  useAnimatedReaction(
    () => postCompleteControl.value,
    (val) => {
      if (val === 1) {
        // Trigger long press action
        runOnJS(onLongPress)();
        runOnJS(resetButton)();
      }
    },
  );

  // Button is pressed
  const triggerPressStart = () => {
    const duration =
      (preCompleteControl.value / progressOrigin.value) * animationDuration;
    preCompleteControl.value = withTiming(progressDestination.value, {
      duration,
    });
    pressControl.value = withTiming(0, {
      duration: 200,
    });
  };

  // Button is released
  const triggerPressEnd = () => {
    const duration =
      ((progressOrigin.value - preCompleteControl.value) /
        progressOrigin.value) *
      animationDuration;
    preCompleteControl.value = withTiming(progressOrigin.value, {
      duration,
    });
    pressControl.value = withTiming(1, {
      duration: 400,
    });
  };

  const outerCircleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          postCompleteControl.value,
          [0, 0.5],
          [1, 0],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  const innerCircleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          postCompleteControl.value,
          [0, 0.5],
          [1, 0],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  const preCompletedContainerStyle = useAnimatedStyle(() => ({
    opacity: progressContainerOpacity.value,
  }));

  const lockIconStyle = useAnimatedStyle(() => ({
    opacity: pressControl.value,
    // transform: [{ scale: pressControl.value }],
  }));

  const checkIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          postCompleteControl.value,
          [0.5, 1],
          [0, 1],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          pressControl.value,
          [0, 1],
          [0.97, 1],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  const renderPostCompletedContent = () => (
    <View style={styles.absoluteFill}>
      <Animated.View style={[styles.outerCircle, outerCircleStyle]}>
        <Animated.View style={[styles.innerCircle, innerCircleStyle]} />
      </Animated.View>
      <Animated.View style={[styles.absoluteFillWithCenter, checkIconStyle]}>
        <Icon
          name={'check'}
          color={colors.primary.inverse}
          size={iconSize * 1.5}
        />
      </Animated.View>
    </View>
  );

  const renderPreCompletedContent = () => (
    <Animated.View
      style={[styles.preCompletedContainerStyle, preCompletedContainerStyle]}
    >
      <Animated.View style={[styles.absoluteFillWithCenter, lockIconStyle]}>
        <Icon name={'lock'} color={colors.primary.inverse} size={iconSize} />
      </Animated.View>
      <Svg style={styles.absoluteFill}>
        <Circle
          cx={radius}
          cy={radius}
          r={innerRadius}
          stroke={colors.primary.alternative}
          strokeWidth={strokeWidth}
          strokeLinecap={'round'}
        />
      </Svg>
      <Svg style={[styles.absoluteFill, styles.animatedCircle]}>
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={radius}
          cy={radius}
          r={innerRadius}
          stroke={colors.primary.inverse}
          strokeWidth={strokeWidth}
          strokeLinecap={'round'}
          strokeDasharray={`${circumference} ${circumference}`}
        />
      </Svg>
    </Animated.View>
  );

  return (
    <TouchableOpacity
      onPressIn={triggerPressStart}
      onPressOut={triggerPressEnd}
      activeOpacity={1}
    >
      <Animated.View style={[styles.container, containerStyle]}>
        <View style={styles.progressContainer}>
          {renderPostCompletedContent()}
          {renderPreCompletedContent()}
        </View>
        <Text style={styles.label}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default ButtonReveal;
