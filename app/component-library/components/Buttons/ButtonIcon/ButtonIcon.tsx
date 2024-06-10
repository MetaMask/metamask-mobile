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
  DEFAULT_BUTTONICON_SIZE,
  DEFAULT_BUTTONICON_VARIANTS,
  ICONSIZE_BY_BUTTONICONSIZE,
} from './ButtonIcon.constants';

const ButtonIcon = ({
  iconName,
  variant = DEFAULT_BUTTONICON_VARIANTS,
  onPressIn,
  onPressOut,
  style,
  size = DEFAULT_BUTTONICON_SIZE,
  iconColorOverride = undefined,
  isDisabled = false,
  ...props
}: ButtonIconProps) => {
  const [pressed, setPressed] = useState(false);
  const {
    styles,
    theme: { colors },
  } = useStyles(stylesheet, { style, size, pressed, isDisabled });
  const iconColor = useMemo(() => {
    let color: string;
    if (isDisabled) {
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
  }, [colors, variant, isDisabled]);

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
      disabled={isDisabled}
      {...props}
    >
      <Icon
        name={iconName}
        size={ICONSIZE_BY_BUTTONICONSIZE[size]}
        color={iconColorOverride || iconColor}
      />
    </TouchableOpacity>
  );
};

export default ButtonIcon;
