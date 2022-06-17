/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import { useStyles } from '../../hooks';
import BaseButton from '../BaseButton';
import styleSheet from './ButtonSecondary.styles';
import {
  ButtonSecondaryProps,
  ButtonSecondaryVariant,
} from './ButtonSecondary.types';

const ButtonSecondary = ({
  style,
  variant,
  ...props
}: ButtonSecondaryProps): JSX.Element => {
  const { styles, theme } = useStyles(styleSheet, { style, variant });
  const labelColor = useMemo(() => {
    let color: string;
    switch (variant) {
      case ButtonSecondaryVariant.Normal:
        color = theme.colors.primary.default;
        break;
      case ButtonSecondaryVariant.Danger:
        color = theme.colors.error.default;
        break;
    }
    return color;
  }, [theme, variant]);

  return <BaseButton {...props} style={styles.base} labelColor={labelColor} />;
};

export default ButtonSecondary;
