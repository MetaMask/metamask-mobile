/* eslint-disable react/prop-types */
// Third party dependencies.
import React, { useState, useCallback } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import Text from '../../../../Texts/Text';
import { useStyles } from '../../../../../hooks';
import { ButtonSize } from '../../Button.types';
import Button from '../../foundation/ButtonBase';
import { DEFAULT_TEXT_VARIANT } from '../../../../Texts/Text/Text.constants';

// Internal dependencies.
import { ButtonLinkProps } from './ButtonLink.types';
import styleSheet from './ButtonLink.styles';
import { DEFAULT_BUTTON_LINK_SIZE } from './ButtonLink.constants';

const ButtonLink: React.FC<ButtonLinkProps> = ({
  style,
  textVariant = DEFAULT_TEXT_VARIANT,
  onPressIn,
  onPressOut,
  isDanger = false,
  size = DEFAULT_BUTTON_LINK_SIZE,
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

  return (
    <>
      {size === ButtonSize.Auto ? (
        <Text
          suppressHighlighting
          style={styles.baseText}
          {...props}
          variant={textVariant}
        >
          {label}
        </Text>
      ) : (
        <Button
          style={styles.base}
          labelColor={styles.baseText.color}
          onPressIn={triggerOnPressedIn}
          onPressOut={triggerOnPressedOut}
          label={label}
          {...props}
        />
      )}
    </>
  );
};

export default ButtonLink;
