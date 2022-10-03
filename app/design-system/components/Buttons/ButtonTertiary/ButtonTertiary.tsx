/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import Button from '../ButtonBase';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import {
  ButtonTertiaryProps,
  ButtonTertiaryVariant,
} from './ButtonTertiary.types';
import styleSheet from './ButtonTertiary.styles';

const ButtonTertiary = ({
  style,
  onPressIn,
  onPressOut,
  variant = ButtonTertiaryVariant.Normal,
  ...props
}: ButtonTertiaryProps) => {
  const [pressed, setPressed] = useState(false);
  const { styles, theme } = useStyles(styleSheet, { style });
  const labelColor = useMemo(() => {
    let color: string;
    switch (variant) {
      case ButtonTertiaryVariant.Normal:
        color = pressed
          ? theme.colors.primary.alternative
          : theme.colors.primary.default;
        break;
      case ButtonTertiaryVariant.Danger:
        color = pressed
          ? theme.colors.error.alternative
          : theme.colors.error.default;
        break;
    }
    return color;
  }, [theme, variant, pressed]);

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
    <Button
      style={styles.base}
      labelColor={labelColor}
      onPressIn={triggerOnPressedIn}
      onPressOut={triggerOnPressedOut}
      {...props}
    />
  );
};

export default ButtonTertiary;
