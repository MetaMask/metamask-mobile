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

const Input = React.forwardRef<TextInput, InputProps>(({
  style,
  textVariant = DEFAULT_TEXT_VARIANT,
  isStateStylesDisabled,
  isDisabled = false,
  isReadonly = false,
  onBlur,
  onFocus,
  autoFocus = true,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(autoFocus);

  const { styles } = useStyles(styleSheet, {
    style,
    textVariant,
    isStateStylesDisabled,
    isDisabled,
    isFocused,
  });

  const onBlurHandler = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (!isDisabled) {
        setIsFocused(false);
        onBlur?.(e);
      }
    },
    [isDisabled, setIsFocused, onBlur],
  );

  const onFocusHandler = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (!isDisabled) {
        setIsFocused(true);
        onFocus?.(e);
      }
    },
    [isDisabled, setIsFocused, onFocus],
  );

  return (
    <TextInput
      testID={INPUT_TEST_ID}
      {...props}
      style={styles.base}
      editable={!isDisabled && !isReadonly}
      autoFocus={autoFocus}
      onBlur={onBlurHandler}
      onFocus={onFocusHandler}
      ref={ref}
    />
  );
});

export default Input;
