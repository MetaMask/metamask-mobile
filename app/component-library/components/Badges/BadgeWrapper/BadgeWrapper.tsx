/* eslint-disable react/prop-types */
// Third library dependencies.
import React, { useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies
import { BadgeWrapperProps } from './BadgeWrapper.types';
import styleSheet from './BadgeWrapper.styles';

const BadgeWrapper: React.FC<BadgeWrapperProps> = ({
  anchorElementShape,
  badgePosition,
  badgePositionObj,
  children,
  badge,
  style,
}) => {
  const [elementHeight, setElementHeight] = useState(0);
  const updateElementHeight = (e: LayoutChangeEvent) => {
    setElementHeight(e.nativeEvent.layout.height);
  };

  const { styles } = useStyles(styleSheet, {
    style,
    anchorElementShape,
    badgePosition,
    badgePositionObj,
    elementHeight,
  });

  return (
    <View style={styles.base} onLayout={updateElementHeight}>
      <View>{children}</View>
      <View style={styles.badge}>{badge}</View>
    </View>
  );
};

export default BadgeWrapper;
