/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { GestureResponderEvent, Pressable } from 'react-native';

// External dependencies.
import Icon from '../../Icons/Icon';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { ButtonIconProps } from './ButtonIcon.types';
import stylesheet from './ButtonIcon.styles';
import {
  DEFAULT_BUTTONICON_SIZE,
  DEFAULT_BUTTONICON_ICONCOLOR,
  ICONSIZE_BY_BUTTONICONSIZE,
} from './ButtonIcon.constants';

const ButtonIcon = ({
  iconName,
  onPress,
  onPressIn,
  onPressOut,
  style,
  size = DEFAULT_BUTTONICON_SIZE,
  iconColor = DEFAULT_BUTTONICON_ICONCOLOR,
  isDisabled = false,
  ...props
}: ButtonIconProps) => {
  const [pressed, setPressed] = useState(false);
  const { styles } = useStyles(stylesheet, {
    style,
    size,
    pressed,
    isDisabled,
  });

  const triggerOnPressedIn = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(true);
      onPressIn?.(e);
    },
    [setPressed, onPressIn],
  );

  const triggerOnPressedOut = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(false);
      onPressOut?.(e);
    },
    [setPressed, onPressOut],
  );

  return (
    <Pressable
      style={styles.base}
      onPress={!isDisabled ? onPress : undefined}
      onPressIn={!isDisabled ? triggerOnPressedIn : undefined}
      onPressOut={!isDisabled ? triggerOnPressedOut : undefined}
      accessible
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      <Icon
        name={iconName}
        size={ICONSIZE_BY_BUTTONICONSIZE[size]}
        color={iconColor}
        accessibilityLabel={`icon-${iconName}`}
      />
    </Pressable>
  );
};

export default ButtonIcon;
