/* eslint-disable react/prop-types */

// Third party dependencies.
import React, {
  useCallback,
  useState,
  useRef,
  useImperativeHandle,
} from 'react';
import { Pressable, TextInput, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Input from './foundation/Input';
import { TextVariant } from '../../../components/Texts/Text';

// Internal dependencies.
import styleSheet from './TextField.styles';
import { TextFieldProps } from './TextField.types';
import {
  TEXTFIELD_TEST_ID,
  TEXTFIELD_STARTACCESSORY_TEST_ID,
  TEXTFIELD_ENDACCESSORY_TEST_ID,
} from './TextField.constants';

const TextField = React.forwardRef<TextInput | null, TextFieldProps>(
  (
    {
      style,
      startAccessory,
      endAccessory,
      isError = false,
      inputElement,
      isDisabled = false,
      autoFocus = false,
      onBlur,
      onFocus,
      testID,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(autoFocus);
    const inputRef = useRef<TextInput>(null);

    // Expose the input methods to parent components
    useImperativeHandle<TextInput | null, TextInput | null>(
      ref,
      () => inputRef.current,
      [],
    );

    const { styles } = useStyles(styleSheet, {
      style,
      isError,
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

    const onPressHandler = useCallback(() => {
      if (!isDisabled && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isDisabled]);

    return (
      <Pressable
        style={styles.base}
        testID={TEXTFIELD_TEST_ID}
        onPress={onPressHandler}
      >
        {startAccessory && (
          <View
            style={styles.startAccessory}
            testID={TEXTFIELD_STARTACCESSORY_TEST_ID}
          >
            {startAccessory}
          </View>
        )}
        <View style={styles.inputContainer}>
          {inputElement ?? (
            <Input
              textVariant={TextVariant.BodyMD}
              isDisabled={isDisabled}
              autoFocus={autoFocus}
              onBlur={onBlurHandler}
              onFocus={onFocusHandler}
              testID={testID}
              style={styles.input}
              numberOfLines={1}
              multiline={false}
              {...props}
              ref={inputRef}
              isStateStylesDisabled
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
      </Pressable>
    );
  },
);

export default TextField;
