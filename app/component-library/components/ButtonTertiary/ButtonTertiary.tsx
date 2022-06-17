/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import { useStyles } from '../../hooks';
import BaseButton from '../BaseButton';
import styleSheet from './ButtonTertiary.styles';
import {
  ButtonTertiaryProps,
  ButtonTertiaryVariant,
} from './ButtonTertiary.types';

const ButtonTertiary = ({
  style,
  variant,
  ...props
}: ButtonTertiaryProps): JSX.Element => {
  const { styles, theme } = useStyles(styleSheet, { style, variant });
  const labelColor = useMemo(() => {
    let color: string;
    switch (variant) {
      case ButtonTertiaryVariant.Normal:
        color = theme.colors.primary.default;
        break;
      case ButtonTertiaryVariant.Danger:
        color = theme.colors.error.default;
        break;
    }
    return color;
  }, [theme, variant]);

  return <BaseButton {...props} style={styles.base} labelColor={labelColor} />;
};

export default ButtonTertiary;
