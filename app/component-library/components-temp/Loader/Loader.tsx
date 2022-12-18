// Third party dependencies.
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './Loader.styles';
import { LoaderProps } from './Loader.types';

const Loader = ({ size = 'large' }: LoaderProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  return (
    <View style={styles.base}>
      <ActivityIndicator size={size} color={colors.primary.default} />
    </View>
  );
};

export default Loader;
