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
  const { styles } = useStyles(styleSheet, { style });
  return <BaseButton {...props} style={styles.base} />;
};

export default ButtonPrimary;
