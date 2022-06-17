/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import { useStyles } from '../../hooks';
import BaseButton from '../BaseButton';
import styleSheet from './ButtonPrimary.styles';
import {
  ButtonPrimaryProps,
  ButtonPrimaryVariant,
} from './ButtonPrimary.types';

const ButtonPrimary = ({
  style,
  variant,
  ...props
}: ButtonPrimaryProps): JSX.Element => {
  const { styles, theme } = useStyles(styleSheet, { style, variant });
  const labelColor = useMemo(() => {
    let color: string;
    switch (variant) {
      case ButtonPrimaryVariant.Normal:
        color = theme.colors.primary.inverse;
        break;
      case ButtonPrimaryVariant.Danger:
        color = theme.colors.error.inverse;
        break;
    }
    return color;
  }, [theme, variant]);

  return <BaseButton {...props} style={styles.base} labelColor={labelColor} />;
};

export default ButtonPrimary;
