/* eslint-disable react/prop-types, react/jsx-pascal-case */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../hooks/useStyles';

// Internal dependencies.
import { IconProps, IconSize } from './Icon.types';
import styleSheet from './Icon.styles';
import { assetByIconName } from './Icon.assets';

const Icon = ({
  size = IconSize.Md,
  style,
  name,
  color,
  ...props
}: IconProps) => {
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
      {...props}
    />
  );
};

export default Icon;
