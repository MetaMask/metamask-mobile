/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent, TouchableOpacity } from 'react-native';

// External dependencies.
import Icon from '../../Icons/Icon';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { ButtonIconProps, ButtonIconVariants } from './ButtonIcon.types';
import stylesheet from './ButtonIcon.styles';
import {
  DEFAULT_BUTTON_ICON_SIZE,
  DEFAULT_BUTTON_ICON_VARIANTS,
  ICON_SIZE_BY_BUTTON_ICON_SIZE,
} from './ButtonIcon.constants';

const ButtonIcon = ({
  iconName,
  variant = DEFAULT_BUTTON_ICON_VARIANTS,
  disabled,
  onPressIn,
  onPressOut,
  style,
  size = DEFAULT_BUTTON_ICON_SIZE,
  iconColorOverride = undefined,
  ...props
}: ButtonIconProps) => {
  const [pressed, setPressed] = useState(false);
  const {
    styles,
    theme: { colors },
  } = useStyles(stylesheet, { style, size, pressed });
  const iconColor = useMemo(() => {
    let color: string;
    if (disabled) {
      color = colors.icon.muted;
    } else {
      switch (variant) {
        case ButtonIconVariants.Primary:
          color = colors.primary.default;
          break;
        case ButtonIconVariants.Secondary:
          color = colors.icon.default;
          break;
      }
    }
    return color;
  }, [colors, variant, disabled]);

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
      activeOpacity={1}
      accessible
      disabled={disabled}
      {...props}
    >
      <Icon
        name={iconName}
        size={ICON_SIZE_BY_BUTTON_ICON_SIZE[size]}
        color={iconColorOverride || iconColor}
      />
    </TouchableOpacity>
  );
};

export default ButtonIcon;
