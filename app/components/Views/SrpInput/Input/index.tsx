/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import {
  StyleProp,
  ViewStyle,
  TextInput,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';

// External dependencies.
import { useStyles } from '../../../../component-library/hooks';
import { DEFAULT_TEXT_VARIANT } from '../../../../component-library/components/Texts/Text/Text.constants';

// Internal dependencies.
import styleSheet from './indes.styles';
import { InputProps } from '../../../../component-library/components/Form/TextField/foundation/Input/Input.types';
import { INPUT_TEST_ID } from '../../../../component-library/components/Form/TextField/foundation/Input/Input.constants';

const Input = React.forwardRef<
  TextInput,
  InputProps & {
    inputStyle?: StyleProp<ViewStyle>;
  }
>(
  (
    {
      style,
      textVariant = DEFAULT_TEXT_VARIANT,
      isStateStylesDisabled,
      isDisabled = false,
      isReadonly = false,
      onBlur,
      onFocus,
      autoFocus = false,
      inputStyle,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const { styles } = useStyles(styleSheet, {
      style,
      textVariant,
      isStateStylesDisabled,
      isDisabled,
      isFocused,
      inputStyle,
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
  },
);

export default Input;
