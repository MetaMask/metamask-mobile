/* eslint-disable react/prop-types */
import React from 'react';
import { useStyles } from '../../hooks';
import BaseButton from '../BaseButton';
import styleSheet from './ButtonSecondary.styles';
import { ButtonSecondaryProps } from './ButtonSecondary.types';

const ButtonSecondary = ({
  style,
  ...props
}: ButtonSecondaryProps): JSX.Element => {
  const { styles, theme } = useStyles(styleSheet, { style });
  const secondaryInverseColor = theme.colors.secondary.inverse;
  return (
    <BaseButton
      {...props}
      style={styles.base}
      labelColor={secondaryInverseColor}
    />
  );
};

export default ButtonSecondary;
