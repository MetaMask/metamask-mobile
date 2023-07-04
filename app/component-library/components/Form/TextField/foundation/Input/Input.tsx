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
  isStateStylesDisabled = false,
  isDisabled = false,
  isReadonly = false,
  onBlur,
  onFocus,
  autoFocus = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(autoFocus);

  const { styles } = useStyles(styleSheet, {
    style,
    textVariant,
    isStateStylesDisabled,
    isDisabled,
    isFocused,
  });

  const onBlurHandler = useCallback(
    (e: any) => {
      if (!isDisabled) {
        setIsFocused(false);
        onBlur?.(e);
      }
    },
    [isDisabled, setIsFocused, onBlur],
  );

  const onFocusHandler = useCallback(
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
      autoFocus
      onBlur={onBlurHandler}
      onFocus={onFocusHandler}
    />
  );
};

export default Input;
