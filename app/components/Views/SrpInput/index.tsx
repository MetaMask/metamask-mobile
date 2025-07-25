/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import {
  StyleProp,
  TextInput,
  View,
  ViewStyle,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';

// External dependencies.
import { useStyles } from '../../../component-library/hooks';
import Input from './Input';

// Internal dependencies.
import styleSheet from '../../../component-library/components/Form/TextField/TextField.styles';
import { TextFieldProps } from '../../../component-library/components/Form/TextField/TextField.types';
import {
  DEFAULT_TEXTFIELD_SIZE,
  TOKEN_TEXTFIELD_INPUT_TEXT_VARIANT,
  TEXTFIELD_TEST_ID,
  TEXTFIELD_STARTACCESSORY_TEST_ID,
  TEXTFIELD_ENDACCESSORY_TEST_ID,
} from '../../../component-library/components/Form/TextField/TextField.constants';

const TextField = React.forwardRef<
  TextInput,
  TextFieldProps & {
    inputStyle?: StyleProp<ViewStyle>;
  }
>(
  (
    {
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
      testID,
      inputStyle,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(autoFocus);

    const { styles } = useStyles(styleSheet, {
      style,
      size,
      isError,
      isDisabled,
      isFocused,
    });

    const onBlurHandler = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (!isDisabled) {
          setIsFocused(false);
          onBlur?.(e);
        }
      },
      [isDisabled, setIsFocused, onBlur],
    );

    const onFocusHandler = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
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
          {inputElement ?? (
            <Input
              textVariant={TOKEN_TEXTFIELD_INPUT_TEXT_VARIANT}
              isDisabled={isDisabled}
              autoFocus={autoFocus}
              onBlur={onBlurHandler}
              onFocus={onFocusHandler}
              testID={testID}
              {...props}
              ref={ref}
              isStateStylesDisabled
              inputStyle={inputStyle}
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
  },
);

export default TextField;
