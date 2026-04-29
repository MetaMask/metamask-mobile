/* eslint-disable react/prop-types */

import React, { useCallback, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  TouchableWithoutFeedback,
  TextInputSelectionChangeEventData,
  TextStyle,
} from 'react-native';

import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

import Input from './Input';
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
    const tw = useTailwind();
    const [isFocused, setIsFocused] = useState(false);
    const [inputSelection, setInputSelection] = useState<
      { start: number; end: number } | undefined
    >(undefined);

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
      if (Device.isAndroid()) {
        setInputSelection(event.nativeEvent.selection);
      }
    };

    let borderStyleClass = 'border-muted';
    if (isError) {
      borderStyleClass = 'border-error-default';
    } else if (isFocused) {
      borderStyleClass = 'border-default';
    }

    return (
      <TouchableWithoutFeedback onPress={onInputFocus}>
        <Box
          style={tw.style(
            'flex-row items-center rounded-xl h-12 border px-4 bg-muted',
            isDisabled && 'opacity-50',
            borderStyleClass,
            ...(style ? [StyleSheet.flatten(style)] : []),
          )}
          testID={TEXTFIELD_TEST_ID}
        >
          {startAccessory && (
            <Box twClassName="mr-3" testID={TEXTFIELD_STARTACCESSORY_TEST_ID}>
              {startAccessory}
            </Box>
          )}
          <Box twClassName="flex-1 h-[46px]">
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
          </Box>
          {endAccessory && (
            <Box twClassName="ml-3" testID={TEXTFIELD_ENDACCESSORY_TEST_ID}>
              {endAccessory}
            </Box>
          )}
        </Box>
      </TouchableWithoutFeedback>
    );
  },
);

export default TextField;
