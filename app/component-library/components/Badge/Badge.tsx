/* eslint-disable react/prop-types */
// 3rd library dependencies
import React from 'react';
import { View } from 'react-native';

// External dependencies
import { useStyles } from '../../hooks';

// Internal dependencies
import styleSheet from './Badge.styles';
import { BadgeProps, BadgePositionVariant } from './Badge.types';
import { BADGE_CONTENT_TEST_ID } from './Badge.constants';

const Badge: React.FC<BadgeProps> = ({
  badgeContent,
  children,
  position = BadgePositionVariant.TopRight,
  style,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    position,
  });

  return (
    <View style={styles.base} {...props}>
      <View style={styles.children}>{children}</View>
      <View style={styles.badgeContent} testID={BADGE_CONTENT_TEST_ID}>
        {badgeContent}
      </View>
    </View>
  );
};

export default Badge;
