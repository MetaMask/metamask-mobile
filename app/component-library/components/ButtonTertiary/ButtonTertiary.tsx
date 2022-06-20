/* eslint-disable react/prop-types */
import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent } from 'react-native';
import { useStyles } from '../../hooks';
import BaseButton from '../BaseButton';
import styleSheet from './ButtonTertiary.styles';
import {
  ButtonTertiaryProps,
  ButtonTertiaryVariant,
} from './ButtonTertiary.types';

const ButtonTertiary = ({
  style,
  onPressIn,
  onPressOut,
  variant,
  ...props
}: ButtonTertiaryProps): JSX.Element => {
  const [pressed, setPressed] = useState(false);
  const { styles, theme } = useStyles(styleSheet, { style, variant });
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
    <BaseButton
      style={styles.base}
      labelColor={labelColor}
      onPressIn={triggerOnPressedIn}
      onPressOut={triggerOnPressedOut}
      {...props}
    />
  );
};

export default ButtonTertiary;
