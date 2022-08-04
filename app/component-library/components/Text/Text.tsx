/* eslint-disable react/prop-types */
import React from 'react';
import { Text as RNText } from 'react-native';

import { useStyles } from '../../hooks';

import { TextProps, TextVariant } from './Text.types';
import styleSheet from './Text.styles';

const Text: React.FC<TextProps> = ({
  variant = TextVariant.sBodyMD,
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
