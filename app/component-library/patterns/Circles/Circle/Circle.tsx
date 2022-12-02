/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External depdendencies.
import { useStyles } from '../../../hooks/useStyles';

// Internal dependencies.
import { CirclePatternProps } from './Circle.types';
import styleSheet from './Circle.styles';
import {
  CIRCLE_PATTERN_TEST_ID,
  DEFAULT_CIRCLE_PATTERN_SIZE,
} from './Circle.constants';

const CirclePattern: React.FC<CirclePatternProps> = ({
  style,
  size = DEFAULT_CIRCLE_PATTERN_SIZE,
  children,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  return (
    <View style={styles.base} testID={CIRCLE_PATTERN_TEST_ID}>
      {children}
    </View>
  );
};

export default CirclePattern;
