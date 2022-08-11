/* eslint-disable react/prop-types */
// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies
import { BADGE_CONTENT_TEST_ID } from './Badge.constants';
import { BadgeProps } from './Badge.types';
import styleSheet from './Badge.styles';

const Badge: React.FC<BadgeProps> = ({
  badgeContent,
  children,
  badgeContentStyle,
  style,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    badgeContentStyle,
  });

  return (
    <View style={styles.base} {...props}>
      <View>{children}</View>
      <View style={styles.badgeContent} testID={BADGE_CONTENT_TEST_ID}>
        {badgeContent}
      </View>
    </View>
  );
};

export default Badge;
