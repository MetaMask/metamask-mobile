/* eslint-disable react/prop-types */
import React from 'react';
import { Image } from 'react-native';
import { useStyles } from '../../hooks/useStyles';
import { IconProps } from './Icon.types';
import styleSheet from './Icon.styles';
import SVG from 'react-native-svg';

const Icon = ({ size, style }: IconProps) => {
  const styles = useStyles(styleSheet, {
    size,
    style,
  });

  return <Image height={size} width={size} style={styles.container}></Image>;
};

export default Icon;
