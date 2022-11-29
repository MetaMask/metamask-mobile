/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import Text, { TextVariants } from '../../../../Texts/Text';
import Icon, { IconSize } from '../../../../Icon';
import { useStyles } from '../../../../../hooks';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

// Internal dependencies.
import { ButtonBaseProps } from './ButtonBase.types';
import styleSheet from './ButtonBase.styles';

const ButtonBase = ({
  label,
  iconName,
  size = ButtonSize.Md,
  onPress,
  style,
  labelColor,
  buttonWidth = ButtonWidthTypes.Auto,
  ...props
}: ButtonBaseProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    labelColor,
    buttonWidth,
  });
  return (
    <TouchableOpacity
      activeOpacity={0.5}
      onPress={onPress}
      style={styles.base}
      {...props}
    >
      {iconName && (
        <Icon
          color={labelColor}
          name={iconName}
          size={IconSize.Sm}
          style={styles.icon}
        />
      )}
      <Text variant={TextVariants.sBodyMD} style={styles.label}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default ButtonBase;
