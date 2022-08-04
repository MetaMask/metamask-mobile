/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity } from 'react-native';

import Text, { TextVariant } from '../../Text';
import Icon, { IconSize } from '../../Icon';
import { useStyles } from '../../../hooks';

import { ButtonBaseProps, ButtonBaseSize } from './ButtonBase.types';
import styleSheet from './ButtonBase.styles';

const ButtonBase = ({
  label,
  icon,
  size = ButtonBaseSize.Md,
  onPress,
  style,
  labelColor,
  ...props
}: ButtonBaseProps) => {
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
      <Text variant={TextVariant.sBodyMD} style={styles.label}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default ButtonBase;
