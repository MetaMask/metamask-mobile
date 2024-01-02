/* eslint-disable react/prop-types */
// Third party dependencies.
import React from 'react';
import { Dimensions, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './Skeleton.styles';
import { SkeletonProps } from './Skeleton.types';
import { DEFAULT_SKELETON_SHAPE } from './Skeleton.constants';

const deviceWidth = Dimensions.get('window').width;

const Skeleton: React.FC<SkeletonProps> = ({
  style,
  width,
  height,
  shape = DEFAULT_SKELETON_SHAPE,
}) => {
  const animation = useSharedValue(-1);
  const { styles } = useStyles(styleSheet, { style, width, height, shape });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: animation.value * deviceWidth }],
  }));

  React.useEffect(() => {
    animation.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
  }, []);

  return (
    <View style={styles.base}>
      <Animated.View style={[styles.animationContainer, animatedStyle]}>
        <LinearGradient
          colors={['#a0a0a0', '#b0b0b0', '#b0b0b0', '#a0a0a0']}
          style={[styles.gradient, { width: deviceWidth }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </View>
  );
};

export default Skeleton;
