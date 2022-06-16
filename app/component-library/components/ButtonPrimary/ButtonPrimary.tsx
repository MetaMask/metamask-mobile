/* eslint-disable react/prop-types */
import React from 'react';
import { useStyles } from '../../hooks';
import BaseButton from '../BaseButton';
import styleSheet from './ButtonPrimary.styles';
import { ButtonPrimaryProps } from './ButtonPrimary.types';

const ButtonPrimary = ({
  style,
  ...props
}: ButtonPrimaryProps): JSX.Element => {
  const { styles, theme } = useStyles(styleSheet, { style });
  const primaryInverseColor = theme.colors.primary.inverse;
  return (
    <BaseButton
      {...props}
      style={styles.base}
      labelColor={primaryInverseColor}
    />
  );
};

export default ButtonPrimary;
