// Third party dependencies.
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks/useStyles';

// Internal dependencies.
import Loader from './Loader';
import { LoaderProps } from './Loader.types';
import styleSheet from './Loader.styles';

const LoaderMeta = {
  title: 'Component Library / Loader',
  component: Loader,
  argTypes: {
    size: {
      options: ['small', 'large'],
      control: {
        type: 'select',
      },
    },
    color: {
      control: 'color',
    },
  },
};
export default LoaderMeta;

export const DefaultLoader = (args: LoaderProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  const indicatorColor = args.color ?? colors.primary.default;

  return (
    <View style={styles.base}>
      <ActivityIndicator size={args.size} color={indicatorColor} />
    </View>
  );
};
DefaultLoader.args = {
  size: 'large',
  color: undefined,
};
