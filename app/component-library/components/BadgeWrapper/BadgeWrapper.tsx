/* eslint-disable react/prop-types */
// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies
import { BADGE_WRAPPER_CONTENT_TEST_ID } from './BadgeWrapper.constants';
import { BadgeWrapperProps } from './BadgeWrapper.types';
import styleSheet from './BadgeWrapper.styles';

const BadgeWrapper: React.FC<BadgeWrapperProps> = ({
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
      <View style={styles.content} testID={BADGE_WRAPPER_CONTENT_TEST_ID}>
        {content}
      </View>
    </View>
  );
};

export default BadgeWrapper;
