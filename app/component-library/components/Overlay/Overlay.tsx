/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './Overlay.styles';
import { OverlayProps } from './Overlay.types';

const Overlay: React.FC<OverlayProps> = ({ style, onPress, overlayColor }) => {
  const { styles } = useStyles(styleSheet, { style, overlayColor });

  const overlayOpacity = useDerivedValue(() =>
    interpolate(
      currentYOffset.value,
      [visibleYOffset.value, sheetHeight.value],
      [1, 0],
    ),
  );

  const animatedOverlayStyle = useAnimatedStyle(
    () => ({
      opacity: overlayOpacity.value,
    }),
    [],
  );

  const combinedOverlayStyle = useMemo(
    () => [styles.base, animatedOverlayStyle],
    // eslint-disable-next-line
    [styles.base],
  );

  return (
    <Animated.View style={styles.combinedOverlayStyle}>
      {onPress ? (
        <TouchableOpacity style={styles.fill} />
      ) : (
        <View style={styles.fill} />
      )}
    </Animated.View>
  );
};

export default Overlay;
