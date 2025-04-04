// Third party dependencies.
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './Loader.styles';
import { LoaderProps } from './Loader.types';

const Loader = ({ size = 'large', color }: LoaderProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  const indicatorColor = color ?? colors.primary.default;

  return (
    <View style={styles.base}>
      <ActivityIndicator size={size} color={indicatorColor} />
    </View>
  );
};

export default Loader;
