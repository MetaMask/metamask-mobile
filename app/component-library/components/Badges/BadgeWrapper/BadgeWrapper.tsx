/* eslint-disable react/prop-types */
// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useComponentSize, useStyles } from '../../../hooks';

// Internal dependencies
import { BadgeWrapperProps } from './BadgeWrapper.types';
import styleSheet from './BadgeWrapper.styles';
import {
  DEFAULT_BADGEWRAPPER_BADGEANCHORELEMENTSHAPE,
  DEFAULT_BADGEWRAPPER_BADGEPOSITION,
  BADGE_WRAPPER_BADGE_TEST_ID,
} from './BadgeWrapper.constants';

const BadgeWrapper: React.FC<BadgeWrapperProps> = ({
  anchorElementShape = DEFAULT_BADGEWRAPPER_BADGEANCHORELEMENTSHAPE,
  badgePosition = DEFAULT_BADGEWRAPPER_BADGEPOSITION,
  children,
  badgeElement,
  style,
}) => {
  const { size: containerSize, onLayout: onLayoutContainerSize } =
    useComponentSize();

  const { styles } = useStyles(styleSheet, {
    style,
    anchorElementShape,
    badgePosition,
    containerSize,
  });

  return (
    <View
      style={styles.base}
      onLayout={onLayoutContainerSize}
      testID={BADGE_WRAPPER_BADGE_TEST_ID}
    >
      <View>{children}</View>
      <View style={styles.badge}>{badgeElement}</View>
    </View>
  );
};

export default BadgeWrapper;
