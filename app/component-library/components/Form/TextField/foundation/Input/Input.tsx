/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { TextInput } from 'react-native';

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
      defaultValue,
      placeholder,
      onChangeText,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(autoFocus);
    const [internalValue, setInternalValue] = useState(defaultValue ?? '');

    const isControlledRef = useRef<boolean | null>(null);
    if (isControlledRef.current === null) {
      isControlledRef.current = value !== undefined;
    }
    const isControlled = isControlledRef.current;

    const currentValue = isControlled ? (value ?? '') : internalValue;
    const hasPlaceholder = placeholder != null && placeholder !== '';
    const isPlaceholderVisible =
      hasPlaceholder && (currentValue === '' || currentValue == null);

    useEffect(() => {
      if (!isControlledRef.current) {
        setInternalValue(defaultValue ?? '');
      }
    }, [defaultValue]);

    const { styles, theme } = useStyles(styleSheet, {
      style,
      textVariant,
      isStateStylesDisabled,
      isDisabled,
      isFocused,
      isPlaceholderVisible,
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

    const onChangeTextHandler = useCallback(
      (text: string) => {
        if (!isControlled) {
          setInternalValue(text);
        }
        onChangeText?.(text);
      },
      [isControlled, onChangeText],
    );

    return (
      <TextInput
        testID={INPUT_TEST_ID}
        placeholderTextColor={theme.colors.text.alternative}
        {...props}
        placeholder={placeholder}
        value={isControlled ? value : internalValue}
        onChangeText={onChangeTextHandler}
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
