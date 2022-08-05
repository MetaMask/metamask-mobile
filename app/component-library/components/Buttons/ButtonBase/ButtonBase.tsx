/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import Text, { TextVariant } from '../../Text';
import Icon, { IconSize } from '../../Icon';
import { useStyles } from '../../../hooks';

// Internal dependencies.
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
