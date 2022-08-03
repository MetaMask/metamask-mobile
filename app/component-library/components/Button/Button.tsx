/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useStyles } from '../../hooks';
import styleSheet from './Button.styles';
import { ButtonProps } from './Button.types';
import BaseText, { BaseTextVariant } from '../BaseText';
import Icon, { IconSize } from '../Icon';

const Button = ({
  label,
  icon,
  size,
  onPress,
  style,
  labelColor,
  ...props
}: ButtonProps) => {
  const { styles } = useStyles(styleSheet, { style, size, labelColor });
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={styles.base}
      {...props}
    >
      {icon && (
        <Icon
          color={labelColor}
          name={icon}
          size={IconSize.Sm}
          style={styles.icon}
        />
      )}
      <BaseText variant={BaseTextVariant.sBodyMD} style={styles.label}>
        {label}
      </BaseText>
    </TouchableOpacity>
  );
};

export default Button;
