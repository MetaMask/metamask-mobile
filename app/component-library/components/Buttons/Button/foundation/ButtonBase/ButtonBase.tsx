/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import Text, { TextVariant } from '../../../../Texts/Text';
import Icon, { IconSize } from '../../../../Icons/Icon';
import { useStyles } from '../../../../../hooks';
import {
  DEFAULT_BUTTONBASE_SIZE,
  DEFAULT_BUTTONBASE_WIDTH,
} from './ButtonBase.constants';

// Internal dependencies.
import { ButtonBaseProps } from './ButtonBase.types';
import styleSheet from './ButtonBase.styles';

const ButtonBase = ({
  label,
  startIconName,
  endIconName,
  size = DEFAULT_BUTTONBASE_SIZE,
  onPress,
  style,
  labelColor,
  width = DEFAULT_BUTTONBASE_WIDTH,
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
      {startIconName && (
        <Icon
          color={styles.label.color.toString()}
          name={startIconName}
          size={IconSize.Sm}
          style={styles.startIcon}
        />
      )}
      <Text variant={TextVariant.BodyMD} style={styles.label}>
        {label}
      </Text>
      {endIconName && (
        <Icon
          color={styles.label.color.toString()}
          name={endIconName}
          size={IconSize.Sm}
          style={styles.endIcon}
        />
      )}
    </TouchableOpacity>
  );
};

export default ButtonBase;
