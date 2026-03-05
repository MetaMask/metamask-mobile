/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import {
  TextInput,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import { DEFAULT_TEXT_VARIANT } from '../../../../Texts/Text/Text.constants';

// Internal dependencies.
import styleSheet from './Input.styles';
import { InputProps } from './Input.types';
import { INPUT_TEST_ID } from './Input.constants';

/**
 * @deprecated Please update your code to use `Input` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/Input/README.md}
 * @since @metamask/design-system-react-native@0.7.0
 */
const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      style,
      textVariant = DEFAULT_TEXT_VARIANT,
      isStateStylesDisabled,
      isDisabled = false,
      isReadonly = false,
      onBlur,
      onFocus,
      autoFocus = true,
      value,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(autoFocus);

    const { styles, theme } = useStyles(styleSheet, {
      style,
      textVariant,
      isStateStylesDisabled,
      isDisabled,
      isFocused,
      value,
      placeholder,
    });

    const onBlurHandler = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (!isDisabled) {
          setIsFocused(false);
          onBlur?.(e);
        }
      },
      [isDisabled, onBlur],
    );

    const onFocusHandler = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (!isDisabled) {
          setIsFocused(true);
          onFocus?.(e);
        }
      },
      [isDisabled, onFocus],
    );

    return (
      <TextInput
        testID={INPUT_TEST_ID}
        placeholderTextColor={theme.colors.text.alternative}
        {...props}
        placeholder={placeholder}
        {...(value !== undefined ? { value } : {})}
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
