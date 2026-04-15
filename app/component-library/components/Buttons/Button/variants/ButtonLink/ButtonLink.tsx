/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState, useCallback } from 'react';
import { GestureResponderEvent, StyleProp, TextStyle } from 'react-native';

// External dependencies.
import Text from '../../../../Texts/Text';
import { useStyles } from '../../../../../hooks';
import Button from '../../foundation/ButtonBase';
import { ButtonSize } from '../../Button.types';

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

/**
 * @deprecated ButtonLink has been replaced by design-system components.
 *
 * - Use `TextButton` for inline links within text flows.
 * - Use `Button` with `variant={ButtonVariant.Tertiary}` for standalone link‑style buttons (e.g., CTAs, headers, separators).
 *
 * Examples:
 * Inline: <Text>Forgot your password? <TextButton onPress={...}>Reset</TextButton></Text>
 * Standalone: <Button variant={ButtonVariant.Tertiary} onPress={...}>Forgot password?</Button>
 *
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/TextButton/README.md | TextButton}
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/Button/README.md | Button}
 */
const ButtonLink: React.FC<ButtonLinkProps> = ({
  style,
  onPressIn,
  onPressOut,
  isDanger = false,
  size = DEFAULT_BUTTONLINK_SIZE,
  label,
  labelTextVariant = DEFAULT_BUTTONLINK_LABEL_TEXTVARIANT,
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
        variant={labelTextVariant}
        color={getLabelColor()}
        style={pressed && styles.pressedText}
      >
        {label}
      </Text>
    ) : (
      label
    );

  return (
    <>
      {size === ButtonSize.Auto ? (
        <Text
          style={styles.base as StyleProp<TextStyle>}
          suppressHighlighting
          onPressIn={triggerOnPressedIn}
          onPressOut={triggerOnPressedOut}
          accessibilityRole="link"
          accessible
          {...props}
        >
          {renderLabel()}
        </Text>
      ) : (
        <Button
          style={styles.base}
          label={renderLabel()}
          labelColor={getLabelColor()}
          onPressIn={triggerOnPressedIn}
          onPressOut={triggerOnPressedOut}
          size={size}
          {...props}
        />
      )}
    </>
  );
};

export default ButtonLink;
