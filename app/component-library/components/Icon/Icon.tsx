/* eslint-disable react/prop-types, react/jsx-pascal-case */
import React from 'react';
import { useStyles } from '../../hooks/useStyles';
import { IconProps } from './Icon.types';
import styleSheet from './Icon.styles';
import { assetByIconName } from './Icon.assets';

const Icon = ({ size, style, name, color }: IconProps) => {
  const { styles, theme } = useStyles(styleSheet, {
    size,
    style,
  });
  const iconColor = color || theme.colors.icon.default;
  const SVG = assetByIconName[name];
  const sizeAsNum = Number(size);

  return (
    <SVG
      color={iconColor}
      style={styles.container}
      width={sizeAsNum}
      height={sizeAsNum}
    />
  );
};

export default Icon;
