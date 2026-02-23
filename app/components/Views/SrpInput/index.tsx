/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import {
  StyleProp,
  TextInput,
  View,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  TouchableWithoutFeedback,
  TextInputSelectionChangeEventData,
  TextStyle,
} from 'react-native';

// External dependencies.
import { useStyles } from '../../../component-library/hooks';
import Input from './Input';

// Internal dependencies.
import styleSheet from '../../../component-library/components/Form/TextField/TextField.styles';
import { TextFieldProps } from '../../../component-library/components/Form/TextField/TextField.types';
import {
  TEXTFIELD_TEST_ID,
  TEXTFIELD_STARTACCESSORY_TEST_ID,
  TEXTFIELD_ENDACCESSORY_TEST_ID,
} from '../../../component-library/components/Form/TextField/TextField.constants';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Device from '../../../util/device';

const TextField = React.forwardRef<
  TextInput,
  TextFieldProps & {
    inputStyle?: StyleProp<TextStyle>;
    onInputFocus?: () => void;
  }
>(
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
      inputStyle,
      onInputFocus,
      value,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [inputSelection, setInputSelection] = useState<
      { start: number; end: number } | undefined
    >(undefined);

    const { styles } = useStyles(styleSheet, {
      style,
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
        if (Device.isAndroid()) {
          setInputSelection({ start: 0, end: 0 });
        }
      },
      [isDisabled, setIsFocused, onBlur],
    );

    const onFocusHandler = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (!isDisabled) {
          setIsFocused(true);
          onFocus?.(e);

          if (Device.isAndroid()) {
            setInputSelection({
              start: value?.length ?? 0,
              end: value?.length ?? 0,
            });
          }
        }
      },
      [isDisabled, setIsFocused, onFocus, value],
    );

    const handleSelectionChange = (
      event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
    ) => {
      // Update selection state when user manually changes cursor position
      if (Device.isAndroid()) {
        setInputSelection(event.nativeEvent.selection);
      }
    };

    return (
      <TouchableWithoutFeedback onPress={onInputFocus}>
        <View style={styles.base} testID={TEXTFIELD_TEST_ID}>
          {startAccessory && (
            <View
              style={styles.startAccessory}
              testID={TEXTFIELD_STARTACCESSORY_TEST_ID}
            >
              {startAccessory}
            </View>
          )}
          <View style={[styles.input, styles.inputContainer]}>
            {inputElement ?? (
              <Input
                textVariant={TextVariant.BodyMD}
                isDisabled={isDisabled}
                autoFocus={autoFocus}
                onBlur={onBlurHandler}
                onFocus={onFocusHandler}
                testID={testID}
                {...props}
                ref={ref}
                isStateStylesDisabled
                inputStyle={inputStyle}
                selection={inputSelection}
                onSelectionChange={handleSelectionChange}
                value={value}
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
      </TouchableWithoutFeedback>
    );
  },
);

export default TextField;
