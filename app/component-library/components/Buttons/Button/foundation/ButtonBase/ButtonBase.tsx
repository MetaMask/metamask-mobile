/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import Text, { TextVariant } from '../../../../Texts/Text';
import Icon, { IconSize } from '../../../../Icon';
import { useStyles } from '../../../../../hooks';
import {
  DEFAULT_BUTTON_SIZE,
  DEFAULT_BUTTON_WIDTH,
} from '../../Button.constants';

// Internal dependencies.
import { ButtonBaseProps } from './ButtonBase.types';
import styleSheet from './ButtonBase.styles';

const ButtonBase = ({
  label,
  iconName,
  size = DEFAULT_BUTTON_SIZE,
  onPress,
  style,
  labelColor,
  width = DEFAULT_BUTTON_WIDTH,
  ...props
}: ButtonBaseProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    labelColor,
    width,
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
      <Text variant={TextVariant.BodyMD} style={styles.label}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default ButtonBase;
