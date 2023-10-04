/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Button from '../../foundation/ButtonBase';
import Text from '../../../../Texts/Text/Text';

// Internal dependencies.
import { ButtonSecondaryProps } from './ButtonSecondary.types';
import styleSheet from './ButtonSecondary.styles';
import {
  DEFAULT_BUTTONSECONDARY_LABEL_TEXTVARIANT,
  DEFAULT_BUTTONSECONDARY_LABEL_COLOR,
  DEFAULT_BUTTONSECONDARY_LABEL_COLOR_PRESSED,
  DEFAULT_BUTTONSECONDARY_LABEL_COLOR_ERROR,
  DEFAULT_BUTTONSECONDARY_LABEL_COLOR_ERROR_PRESSED,
} from './ButtonSecondary.constants';

const ButtonSecondary = ({
  style,
  onPressIn,
  onPressOut,
  isDanger = false,
  label,
  ...props
}: ButtonSecondaryProps) => {
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

  const getLabelColor = () =>
    isDanger
      ? pressed
        ? DEFAULT_BUTTONSECONDARY_LABEL_COLOR_ERROR_PRESSED
        : DEFAULT_BUTTONSECONDARY_LABEL_COLOR_ERROR
      : pressed
      ? DEFAULT_BUTTONSECONDARY_LABEL_COLOR_PRESSED
      : DEFAULT_BUTTONSECONDARY_LABEL_COLOR;

  const renderLabel = () =>
    typeof label === 'string' ? (
      <Text
        variant={DEFAULT_BUTTONSECONDARY_LABEL_TEXTVARIANT}
        color={getLabelColor()}
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
      {...props}
    />
  );
};

export default ButtonSecondary;
