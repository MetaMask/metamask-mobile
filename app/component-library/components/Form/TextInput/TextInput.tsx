/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { TextInput as RNTextInput } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import { DEFAULT_TEXT_VARIANT } from '../../Texts/Text/Text.constants';

// Internal dependencies.
import styleSheet from './TextInput.styles';
import { TextInputProps } from './TextInput.types';
import { TEXTINPUT_TEST_ID } from './TextInput.constants';

const TextInput: React.FC<TextInputProps> = ({
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

  const onBlurHandler = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const onFocusHandler = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };
  return (
    <RNTextInput
      testID={TEXTINPUT_TEST_ID}
      {...props}
      style={styles.base}
      editable={!disabled}
      autoFocus
      onBlur={onBlurHandler}
      onFocus={onFocusHandler}
    />
  );
};

export default TextInput;
