/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Button from '../../foundation/ButtonBase';

// Internal dependencies.
import {
  ButtonPrimaryProps,
  ButtonPrimaryVariants,
} from './ButtonPrimary.types';
import styleSheet from './ButtonPrimary.styles';

const ButtonPrimary = ({
  style,
  onPressIn,
  onPressOut,
  buttonPrimaryVariants = ButtonPrimaryVariants.Normal,
  ...props
}: ButtonPrimaryProps) => {
  const [pressed, setPressed] = useState(false);
  const { styles, theme } = useStyles(styleSheet, {
    style,
    buttonPrimaryVariants,
    pressed,
  });
  const labelColor = useMemo(() => {
    let color: string;
    switch (buttonPrimaryVariants) {
      case ButtonPrimaryVariants.Normal:
        color = theme.colors.primary.inverse;
        break;
      case ButtonPrimaryVariants.Danger:
        color = theme.colors.error.inverse;
        break;
    }
    return color;
  }, [theme, buttonPrimaryVariants]);

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

export default ButtonPrimary;
