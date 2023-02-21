/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Button from '../../foundation/ButtonBase';

// Internal dependencies.
import { ButtonPrimaryProps } from './ButtonPrimary.types';
import styleSheet from './ButtonPrimary.styles';

const ButtonPrimary = ({
  style,
  onPressIn,
  onPressOut,
  isDanger = false,
  ...props
}: ButtonPrimaryProps) => {
  const [pressed, setPressed] = useState(false);
  const { styles, theme } = useStyles(styleSheet, {
    style,
    isDanger,
    pressed,
  });
  const labelColor = useMemo(() => {
    const color: string = isDanger
      ? theme.colors.error.inverse
      : theme.colors.primary.inverse;
    return color;
  }, [theme, isDanger]);

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
