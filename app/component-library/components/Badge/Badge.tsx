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
  content,
  children,
  contentStyle,
  style,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    contentStyle,
  });

  return (
    <View style={styles.base} {...props}>
      <View>{children}</View>
      <View style={styles.content} testID={BADGE_CONTENT_TEST_ID}>
        {content}
      </View>
    </View>
  );
};

export default Badge;
