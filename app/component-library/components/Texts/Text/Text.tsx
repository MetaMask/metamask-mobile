/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Text as RNText } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { TextProps, TextVariants } from './Text.types';
import styleSheet from './Text.styles';

const Text: React.FC<TextProps> = ({
  variant = TextVariants.sBodyMD,
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
