/* eslint-disable react/prop-types */
import React from 'react';
import { Image } from 'react-native';
import { useStyles } from '../../hooks/useStyles';
import { IconProps } from './Icon.types';
import styleSheet from './Icon.styles';
import { assetByIconName } from './Icon.assets';

const Icon = ({ size, style, name }: IconProps) => {
  const styles = useStyles(styleSheet, {
    size,
    style,
  });
  const asset = assetByIconName[name];

  return (
    <Image source={asset} style={styles.container} resizeMode={'contain'} />
  );
};

export default Icon;
