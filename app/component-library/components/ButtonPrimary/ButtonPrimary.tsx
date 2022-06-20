/* eslint-disable react/prop-types */
import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent } from 'react-native';
import { useStyles } from '../../hooks';
import BaseButton from '../BaseButton';
import styleSheet from './ButtonPrimary.styles';
import {
  ButtonPrimaryProps,
  ButtonPrimaryVariant,
} from './ButtonPrimary.types';

const ButtonPrimary = ({
  style,
  onPressIn,
  onPressOut,
  variant,
  ...props
}: ButtonPrimaryProps): JSX.Element => {
  const [pressed, setPressed] = useState(false);
  const { styles, theme } = useStyles(styleSheet, { style, variant, pressed });
  const labelColor = useMemo(() => {
    let color: string;
    switch (variant) {
      case ButtonPrimaryVariant.Normal:
        color = theme.colors.primary.inverse;
        break;
      case ButtonPrimaryVariant.Danger:
        color = theme.colors.error.inverse;
        break;
    }
    return color;
  }, [theme, variant]);

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
    <BaseButton
      style={styles.base}
      labelColor={labelColor}
      onPressIn={triggerOnPressedIn}
      onPressOut={triggerOnPressedOut}
      {...props}
    />
  );
};

export default ButtonPrimary;
