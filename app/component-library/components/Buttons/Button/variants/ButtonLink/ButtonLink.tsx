/* eslint-disable react/prop-types */
// Third party dependencies.
import React, { useState, useCallback } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import Text from '../../../../Texts/Text';
import { useStyles } from '../../../../../hooks';
import Button from '../../foundation/ButtonBase';

// Internal dependencies.
import { ButtonLinkProps } from './ButtonLink.types';
import styleSheet from './ButtonLink.styles';
import {
  DEFAULT_BUTTONLINK_SIZE,
  DEFAULT_BUTTONLINK_LABEL_TEXTVARIANT,
  DEFAULT_BUTTONLINK_LABEL_COLOR,
  DEFAULT_BUTTONLINK_LABEL_COLOR_PRESSED,
  DEFAULT_BUTTONLINK_LABEL_COLOR_ERROR,
  DEFAULT_BUTTONLINK_LABEL_COLOR_ERROR_PRESSED,
} from './ButtonLink.constants';

const ButtonLink: React.FC<ButtonLinkProps> = ({
  style,
  onPressIn,
  onPressOut,
  isDanger = false,
  size = DEFAULT_BUTTONLINK_SIZE,
  label,
  ...props
}) => {
  const [pressed, setPressed] = useState(false);
  const { styles } = useStyles(styleSheet, { style, isDanger, pressed });

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

  const getLabelColor = () =>
    isDanger
      ? pressed
        ? DEFAULT_BUTTONLINK_LABEL_COLOR_ERROR_PRESSED
        : DEFAULT_BUTTONLINK_LABEL_COLOR_ERROR
      : pressed
      ? DEFAULT_BUTTONLINK_LABEL_COLOR_PRESSED
      : DEFAULT_BUTTONLINK_LABEL_COLOR;

  const renderLabel = () =>
    typeof label === 'string' ? (
      <Text
        variant={DEFAULT_BUTTONLINK_LABEL_TEXTVARIANT}
        color={getLabelColor()}
        style={pressed && styles.pressedText}
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
      labelColor={getLabelColor()}
      onPressIn={triggerOnPressedIn}
      onPressOut={triggerOnPressedOut}
      size={size}
      {...props}
    />
  );
};

export default ButtonLink;
