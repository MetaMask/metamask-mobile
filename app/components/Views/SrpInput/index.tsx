/* eslint-disable react/prop-types */

import React, { useCallback, useRef, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  NativeSyntheticEvent,
  TouchableWithoutFeedback,
  TextInputSelectionChangeEventData,
  TextStyle,
  type BlurEvent,
  type FocusEvent,
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
    const inputRef = useRef<TextInput | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [inputSelection, setInputSelection] = useState<
      { start: number; end: number } | undefined
    >(undefined);

    const assignRef = useCallback(
      (node: TextInput | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const placeCaretAtEnd = useCallback(() => {
      const end = value?.length ?? 0;
      const selection = { start: end, end };
      setInputSelection(selection);
      inputRef.current?.setNativeProps({ selection });
    }, [value]);

    const onBlurHandler = useCallback(
      (e: BlurEvent) => {
        if (!isDisabled) {
          setIsFocused(false);
          onBlur?.(e);
        }
        const end = value?.length ?? 0;
        setInputSelection({ start: end, end });
      },
      [isDisabled, onBlur, value],
    );

    const onFocusHandler = useCallback(
      (e: FocusEvent) => {
        if (!isDisabled) {
          setIsFocused(true);
          onFocus?.(e);
          placeCaretAtEnd();
        }
      },
      [isDisabled, onFocus, placeCaretAtEnd],
    );

    const handleSelectionChange = (
      event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
    ) => {
      setInputSelection(event.nativeEvent.selection);
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
                ref={assignRef}
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
