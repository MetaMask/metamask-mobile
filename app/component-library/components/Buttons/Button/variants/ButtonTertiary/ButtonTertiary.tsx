/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import Button from '../../foundation/ButtonBase';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import { ButtonTertiaryProps } from './ButtonTertiary.types';
import styleSheet from './ButtonTertiary.styles';

const ButtonTertiary = ({
  style,
  onPressIn,
  onPressOut,
  isDanger = false,
  ...props
}: ButtonTertiaryProps) => {
  const [pressed, setPressed] = useState(false);
  const { styles, theme } = useStyles(styleSheet, { style });
  const labelColor = useMemo(() => {
    const colorObj = isDanger ? theme.colors.error : theme.colors.primary;
    const color: string = pressed ? colorObj.alternative : colorObj.default;
    return color;
  }, [theme, isDanger, pressed]);

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
