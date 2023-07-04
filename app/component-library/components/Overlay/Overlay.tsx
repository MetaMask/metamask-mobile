/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './Overlay.styles';
import { OverlayProps } from './Overlay.types';
import { DEFAULT_OVERLAY_ANIMATION_DURATION } from './Overlay.constants';

const Overlay: React.FC<OverlayProps> = ({ style, onPress, color }) => {
  const { styles } = useStyles(styleSheet, { style, color });
  const opacityVal = useSharedValue(0);
  const animatedStyles = useAnimatedStyle(
    () => ({
      opacity: opacityVal.value,
    }),
    [opacityVal.value],
  );

  opacityVal.value = withTiming(1, {
    duration: DEFAULT_OVERLAY_ANIMATION_DURATION,
    easing: Easing.linear,
  });

  return (
    <Animated.View style={[styles.base, animatedStyles]}>
      {onPress && <TouchableOpacity onPress={onPress} style={styles.fill} />}
    </Animated.View>
  );
};

export default Overlay;
