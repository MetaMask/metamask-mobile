/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import Text, { TextVariant } from '../../../../Texts/Text';
import Icon from '../../../../Icons/Icon';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import { ButtonBaseProps } from './ButtonBase.types';
import styleSheet from './ButtonBase.styles';
import {
  DEFAULT_BUTTONBASE_SIZE,
  DEFAULT_BUTTONBASE_WIDTH,
  DEFAULT_BUTTONBASE_ICON_SIZE,
} from './ButtonBase.constants';

const ButtonBase = ({
  label,
  startIconName,
  endIconName,
  size = DEFAULT_BUTTONBASE_SIZE,
  onPress,
  style,
  labelColor,
  width = DEFAULT_BUTTONBASE_WIDTH,
  isDisabled,
  ...props
}: ButtonBaseProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    labelColor,
    width,
    isDisabled,
  });
  return (
    <TouchableOpacity
      disabled={isDisabled}
      activeOpacity={0.5}
      onPress={onPress}
      style={styles.base}
      {...props}
    >
      {startIconName && (
        <Icon
          color={styles.label.color.toString()}
          name={startIconName}
          size={DEFAULT_BUTTONBASE_ICON_SIZE}
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
          size={DEFAULT_BUTTONBASE_ICON_SIZE}
          style={styles.endIcon}
        />
      )}
    </TouchableOpacity>
  );
};

export default ButtonBase;
