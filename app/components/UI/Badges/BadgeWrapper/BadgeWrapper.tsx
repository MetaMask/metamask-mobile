/* eslint-disable react/prop-types */
// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import styleSheet from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.styles';
import { useStyles } from '../../../hooks/useStyles';
import Badge from '../Badge/Badge';

// Internal dependencies
import { BADGE_WRAPPER_BADGE_TEST_ID } from './BadgeWrapper.constants';
import { BadgeWrapperProps } from './BadgeWrapper.types';

const BadgeWrapper: React.FC<BadgeWrapperProps> = ({
  badgeProps,
  children,
  style,
}) => {
  const badgeStyle = badgeProps.style;
  const { styles } = useStyles(styleSheet, {
    style,
    badgeStyle,
  });

  return (
    <View style={styles.base}>
      <View>{children}</View>
      <Badge
        testID={BADGE_WRAPPER_BADGE_TEST_ID}
        {...badgeProps}
        style={styles.badge}
      />
    </View>
  );
};

export default BadgeWrapper;
