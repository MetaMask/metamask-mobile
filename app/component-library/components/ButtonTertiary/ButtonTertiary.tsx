/* eslint-disable react/prop-types */
import React from 'react';
import { useStyles } from '../../hooks';
import BaseButton from '../BaseButton';
import styleSheet from './ButtonTertiary.styles';
import { ButtonTertiaryProps } from './ButtonTertiary.types';

const ButtonTertiary = ({
  style,
  ...props
}: ButtonTertiaryProps): JSX.Element => {
  const { styles, theme } = useStyles(styleSheet, { style });
  const primaryDefaultColor = theme.colors.primary.default;
  return (
    <BaseButton
      {...props}
      style={styles.base}
      labelColor={primaryDefaultColor}
    />
  );
};

export default ButtonTertiary;
