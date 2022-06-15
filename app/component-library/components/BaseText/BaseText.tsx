/* eslint-disable react/prop-types */
import React from 'react';
import { Text } from 'react-native';
import { useStyles } from '../../hooks';
import styleSheet from './BaseText.styles';
import { BaseTextProps } from './BaseText.types';

const BaseText: React.FC<BaseTextProps> = ({
  variant,
  style,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { variant, style });
  return (
    <Text {...props} style={styles.base}>
      {children}
    </Text>
  );
};

export default BaseText;
