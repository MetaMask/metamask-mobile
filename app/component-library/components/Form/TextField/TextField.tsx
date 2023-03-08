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
  error = false,
  inputComponent,
  disabled = false,
  autoFocus = false,
  onBlur,
  onFocus,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(autoFocus);

  const { styles } = useStyles(styleSheet, {
    style,
    size,
    error,
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
        {inputComponent ? (
          { inputComponent }
        ) : (
          <Input
            disableStateStyles
            textVariant={TOKEN_TEXTFIELD_INPUT_TEXT_VARIANT}
            disabled={disabled}
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
