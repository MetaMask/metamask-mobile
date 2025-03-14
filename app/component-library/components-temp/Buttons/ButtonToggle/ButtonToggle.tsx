/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, GestureResponderEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Button from '../../../components/Buttons/Button/foundation/ButtonBase';
import Text from '../../../components/Texts/Text/Text';

// Internal dependencies.
import { ButtonToggleProps } from './ButtonToggle.types';
import styleSheet from './ButtonToggle.styles';
import {
  DEFAULT_BUTTONTOGGLE_LABEL_TEXTVARIANT,
  DEFAULT_BUTTONTOGGLE_LABEL_COLOR,
  DEFAULT_BUTTONTOGGLE_LABEL_COLOR_ACTIVE,
  DEFAULT_BUTTONTOGGLE_LABEL_COLOR_PRESSED,
  DEFAULT_BUTTONTOGGLE_LABEL_COLOR_ACTIVE_PRESSED,
} from './ButtonToggle.constants';

const ButtonToggle = ({
  style,
  onPressIn,
  onPressOut,
  isActive = false,
  label,
  ...props
}: ButtonToggleProps) => {
  const [pressed, setPressed] = useState(false);
  const { styles } = useStyles(styleSheet, {
    style,
    isActive,
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
    isActive
      ? pressed
        ? DEFAULT_BUTTONTOGGLE_LABEL_COLOR_ACTIVE_PRESSED
        : DEFAULT_BUTTONTOGGLE_LABEL_COLOR_ACTIVE
      : pressed
      ? DEFAULT_BUTTONTOGGLE_LABEL_COLOR_PRESSED
      : DEFAULT_BUTTONTOGGLE_LABEL_COLOR;

  const renderLabel = () =>
    typeof label === 'string' ? (
      <Text
        variant={DEFAULT_BUTTONTOGGLE_LABEL_TEXTVARIANT}
        color={getLabelColor()}
      >
        {label}
      </Text>
    ) : (
      label
    );

  const renderLoading = () => (
    <ActivityIndicator
      size="small"
      color={DEFAULT_BUTTONTOGGLE_LABEL_TEXTVARIANT}
    />
  );

  return (
    <Button
      style={styles.base}
      label={!props.loading ? renderLabel() : renderLoading()}
      labelColor={getLabelColor()}
      onPressIn={triggerOnPressedIn}
      onPressOut={triggerOnPressedOut}
      {...props}
    />
  );
};

export default ButtonToggle;
