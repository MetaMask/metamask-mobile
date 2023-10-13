/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Input from './foundation/Input';

// Internal dependencies.
import styleSheet from './TextField.styles';
import { TextFieldProps } from './TextField.types';
import {
  DEFAULT_TEXTFIELD_SIZE,
  TOKEN_TEXTFIELD_INPUT_TEXT_VARIANT,
  TEXTFIELD_TEST_ID,
  TEXTFIELD_STARTACCESSORY_TEST_ID,
  TEXTFIELD_ENDACCESSORY_TEST_ID,
} from './TextField.constants';

const TextField: React.FC<TextFieldProps> = ({
  style,
  size = DEFAULT_TEXTFIELD_SIZE,
  startAccessory,
  endAccessory,
  isError = false,
  inputElement,
  isDisabled = false,
  autoFocus = false,
  onBlur,
  onFocus,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(autoFocus);

  const { styles } = useStyles(styleSheet, {
    style,
    size,
    isError,
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
    <View style={styles.base} testID={TEXTFIELD_TEST_ID}>
      {startAccessory && (
        <View
          style={styles.startAccessory}
          testID={TEXTFIELD_STARTACCESSORY_TEST_ID}
        >
          {startAccessory}
        </View>
      )}
      <View style={styles.input}>
        {inputElement ? (
          { inputElement }
        ) : (
          <Input
            isStateStylesDisabled
            textVariant={TOKEN_TEXTFIELD_INPUT_TEXT_VARIANT}
            isDisabled={isDisabled}
            autoFocus={autoFocus}
            onBlur={onBlurHandler}
            onFocus={onFocusHandler}
            {...props}
          />
        )}
      </View>
      {endAccessory && (
        <View
          style={styles.endAccessory}
          testID={TEXTFIELD_ENDACCESSORY_TEST_ID}
        >
          {endAccessory}
        </View>
      )}
    </View>
  );
};

export default TextField;
