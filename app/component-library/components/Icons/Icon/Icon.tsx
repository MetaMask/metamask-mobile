/* eslint-disable react/prop-types, react/jsx-pascal-case */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks/useStyles';

// Internal dependencies.
import { IconProps, IconColor } from './Icon.types';
import styleSheet from './Icon.styles';
import { assetByIconName } from './Icon.assets';
import { DEFAULT_ICON_SIZE, DEFAULT_ICON_COLOR } from './Icon.constants';

const Icon = ({
  size = DEFAULT_ICON_SIZE,
  style,
  name,
  color = DEFAULT_ICON_COLOR,
  ...props
}: IconProps) => {
  const { styles, theme } = useStyles(styleSheet, {
    size,
    style,
    color,
  });
  const SVG = assetByIconName[name];
  const sizeAsNum = Number(size);
  let iconColor;
  switch (color) {
    case IconColor.Default:
      iconColor = theme.colors.icon.default;
      break;
    case IconColor.Alternative:
      iconColor = theme.colors.icon.alternative;
      break;
    case IconColor.Muted:
      iconColor = theme.colors.icon.muted;
      break;
    case IconColor.Primary:
      iconColor = theme.colors.primary.default;
      break;
    case IconColor.Success:
      iconColor = theme.colors.success.default;
      break;
    case IconColor.Error:
      iconColor = theme.colors.error.default;
      break;
    case IconColor.Warning:
      iconColor = theme.colors.warning.default;
      break;
    case IconColor.Info:
      iconColor = theme.colors.info.default;
      break;
    default:
      iconColor = color;
  }

  return (
    <SVG
      color={iconColor}
      style={styles.icon}
      width={sizeAsNum}
      height={sizeAsNum}
      // This prop it's for testing purposes
      name={name}
      {...props}
    />
  );
};

export default Icon;
