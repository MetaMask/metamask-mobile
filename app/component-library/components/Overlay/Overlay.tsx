/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './Overlay.styles';
import { OverlayProps } from './Overlay.types';
import { DEFAULT_OVERLAY_ANIMATION_DURATION } from './Overlay.constants';

const Overlay: React.FC<OverlayProps> = ({ style, onPress, color }) => {
  const { styles } = useStyles(styleSheet, { style, color });
  return (
    <Animated.View
      entering={FadeIn.duration(DEFAULT_OVERLAY_ANIMATION_DURATION)}
      exiting={FadeOut.duration(DEFAULT_OVERLAY_ANIMATION_DURATION)}
      style={styles.base}
    >
      {onPress && <TouchableOpacity onPress={onPress} style={styles.fill} />}
    </Animated.View>
  );
};

export default Overlay;
