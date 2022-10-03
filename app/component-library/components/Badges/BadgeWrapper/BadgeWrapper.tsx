/* eslint-disable react/prop-types */
// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Badge from '../Badge/Badge';

// Internal dependencies
import { BADGE_WRAPPER_BADGE_TEST_ID } from './BadgeWrapper.constants';
import { BadgeWrapperProps } from './BadgeWrapper.types';
import styleSheet from './BadgeWrapper.styles';

const BadgeWrapper: React.FC<BadgeWrapperProps> = ({
  badgeProps,
  children,
  style,
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });

  return (
    <View style={styles.base}>
      <View>{children}</View>
      <Badge testID={BADGE_WRAPPER_BADGE_TEST_ID} {...badgeProps} />
    </View>
  );
};

export default BadgeWrapper;
