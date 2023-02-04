/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent, TouchableOpacity } from 'react-native';

// External dependencies.
import Icon from '../../Icon';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { ButtonIconProps, ButtonIconVariants } from './ButtonIcon.types';
import stylesheet from './ButtonIcon.styles';
import {
  DEFAULT_BUTTON_ICON_SIZE,
  ICON_SIZE_BY_BUTTON_ICON_SIZE,
} from './ButtonIcon.constants';

const ButtonIcon = ({
  iconName,
  variant = ButtonIconVariants.Primary,
  disabled,
  onPressIn,
  onPressOut,
  style,
  size = DEFAULT_BUTTON_ICON_SIZE,
  ...props
}: ButtonIconProps) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(stylesheet, { style, size });
  const [pressed, setPressed] = useState(false);
  const iconColor = useMemo(() => {
    let color: string;
    if (disabled) {
      color = colors.icon.muted;
    } else {
      switch (variant) {
        case ButtonIconVariants.Primary:
          color = pressed ? colors.primary.alternative : colors.primary.default;
          break;
        case ButtonIconVariants.Secondary:
          color = pressed ? colors.icon.alternative : colors.icon.default;
          break;
      }
    }
    return color;
  }, [colors, variant, disabled, pressed]);

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
    <TouchableOpacity
      style={styles.base}
      onPressIn={triggerOnPressedIn}
      onPressOut={triggerOnPressedOut}
      activeOpacity={0.5}
      {...props}
    >
      <Icon
        name={iconName}
        size={ICON_SIZE_BY_BUTTON_ICON_SIZE[size]}
        color={iconColor}
      />
    </TouchableOpacity>
  );
};

export default ButtonIcon;
