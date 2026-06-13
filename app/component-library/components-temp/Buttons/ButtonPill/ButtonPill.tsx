// Third party dependencies.
import React, { useCallback, useState } from 'react';
import Pressable, { PressableVariant } from '../../Pressable';
import { GestureResponderEvent, TouchableOpacityProps } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import stylesheet from './ButtonPill.styles';

/**
 * ButtonPill component props.
 */
export interface ButtonPillProps extends TouchableOpacityProps {
  /**
   * Optional param to disable the button.
   */
  isDisabled?: boolean;
}

const ButtonPill = ({
  onPress,
  onPressIn,
  onPressOut,
  style,
  isDisabled = false,
  children,
  ...props
}: ButtonPillProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const { styles } = useStyles(stylesheet, {
    style,
    isPressed,
    isDisabled,
  });

  const triggerOnPressedIn = useCallback(
    (e: GestureResponderEvent) => {
      setIsPressed(true);
      onPressIn?.(e);
    },
    [setIsPressed, onPressIn],
  );

  const triggerOnPressedOut = useCallback(
    (e: GestureResponderEvent) => {
      setIsPressed(false);
      onPressOut?.(e);
    },
    [setIsPressed, onPressOut],
  );

  return (
    <Pressable
      variant={PressableVariant.None}
      style={styles.base}
      onPress={!isDisabled ? onPress : undefined}
      onPressIn={!isDisabled ? triggerOnPressedIn : undefined}
      onPressOut={!isDisabled ? triggerOnPressedOut : undefined}
      accessible
      disabled={isDisabled}
      {...props}
    >
      {children}
    </Pressable>
  );
};

export default ButtonPill;
