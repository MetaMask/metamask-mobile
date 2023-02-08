/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { TextInput } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import { DEFAULT_TEXT_VARIANT } from '../../../../Texts/Text/Text.constants';

// Internal dependencies.
import styleSheet from './Input.styles';
import { InputProps } from './Input.types';
import { INPUT_TEST_ID } from './Input.constants';

const Input: React.FC<InputProps> = ({
  style,
  textVariant = DEFAULT_TEXT_VARIANT,
  disableStateStyles = false,
  disabled = false,
  onBlur,
  onFocus,
  autoFocus = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(autoFocus);

  const { styles } = useStyles(styleSheet, {
    style,
    textVariant,
    disableStateStyles,
    disabled,
    isFocused,
  });

  const onBlurHandler = useCallback(
    (e: any) => {
      if (!disabled) {
        setIsFocused(false);
        onBlur?.(e);
      }
    },
    [disabled, setIsFocused, onBlur],
  );

  const onFocusHandler = useCallback(
    (e: any) => {
      if (!disabled) {
        setIsFocused(true);
        onFocus?.(e);
      }
    },
    [disabled, setIsFocused, onFocus],
  );

  return (
    <TextInput
      testID={INPUT_TEST_ID}
      {...props}
      style={styles.base}
      editable={!disabled}
      autoFocus
      onBlur={onBlurHandler}
      onFocus={onFocusHandler}
    />
  );
};

export default Input;
