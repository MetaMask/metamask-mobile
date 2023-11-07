/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Button from '../../foundation/ButtonBase';
import Text from '../../../../Texts/Text/Text';

// Internal dependencies.
import { ButtonPrimaryProps } from './ButtonPrimary.types';
import styleSheet from './ButtonPrimary.styles';
import {
  DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT,
  DEFAULT_BUTTONPRIMARY_LABEL_COLOR,
} from './ButtonPrimary.constants';

const ButtonPrimary = ({
  style,
  onPressIn,
  onPressOut,
  isDanger = false,
  label,
  ...props
}: ButtonPrimaryProps) => {
  const [pressed, setPressed] = useState(false);
  const { styles } = useStyles(styleSheet, {
    style,
    isDanger,
    pressed,
  });

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

  const renderLabel = () =>
    typeof label === 'string' ? (
      <Text
        variant={DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT}
        color={DEFAULT_BUTTONPRIMARY_LABEL_COLOR}
      >
        {label}
      </Text>
    ) : (
      label
    );

  return (
    <Button
      style={styles.base}
      label={renderLabel()}
      labelColor={DEFAULT_BUTTONPRIMARY_LABEL_COLOR}
      onPressIn={triggerOnPressedIn}
      onPressOut={triggerOnPressedOut}
      {...props}
    />
  );
};

export default ButtonPrimary;
