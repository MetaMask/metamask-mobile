/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Text as RNText } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { TextProps } from './Text.types';
import styleSheet from './Text.styles';
import { DEFAULT_TEXT_VARIANT } from './Text.constants';

const Text: React.FC<TextProps> = ({
  variant = DEFAULT_TEXT_VARIANT,
  style,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { variant, style });
  return (
    <RNText {...props} style={styles.base}>
      {children}
    </RNText>
  );
};

export default Text;
