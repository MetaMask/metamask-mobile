/* eslint-disable react/prop-types */
import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent, TouchableOpacity } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import Icon, { IconSize } from '../Icon';
import stylesheet from './IconButton.styles';
import { IconButtonProps, IconButtonVariant } from './IconButton.types';

const IconButton = ({
  icon,
  variant,
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...props
}: IconButtonProps) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(stylesheet, { style });
  const [pressed, setPressed] = useState(false);
  const iconColor = useMemo(() => {
    let color: string;
    if (disabled) {
      color = colors.icon.muted;
    } else {
      switch (variant) {
        case IconButtonVariant.Primary:
          color = pressed ? colors.primary.alternative : colors.primary.default;
          break;
        case IconButtonVariant.Secondary:
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
      activeOpacity={1}
      {...props}
    >
      <Icon name={icon} size={IconSize.Lg} color={iconColor} />
    </TouchableOpacity>
  );
};

export default IconButton;
