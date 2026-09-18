/* eslint-disable react/prop-types */

import React, { useCallback, useRef, useState } from 'react';
import {
  TextInput,
  type BlurEvent,
  type FocusEvent,
  type TextInputSelectionChangeEvent,
} from 'react-native';

import {
  TextField,
  type TextFieldProps,
} from '@metamask/design-system-react-native';

/**
 * Text field for a single Secret Recovery Phrase word. It keeps the caret at
 * the end of the word every time the field is focused so that backspace moves
 * through the phrase one word at a time.
 */
const SrpInput = React.forwardRef<TextInput, TextFieldProps>(
  ({ inputProps, onBlur, onFocus, value, ...props }, ref) => {
    const inputRef = useRef<TextInput | null>(null);
    const [selection, setSelection] = useState<
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
      const caretSelection = { start: end, end };
      setSelection(caretSelection);
      inputRef.current?.setNativeProps({ selection: caretSelection });
    }, [value]);

    const onBlurHandler = useCallback(
      (e: BlurEvent) => {
        onBlur?.(e);
        const end = value?.length ?? 0;
        setSelection({ start: end, end });
      },
      [onBlur, value],
    );

    const onFocusHandler = useCallback(
      (e: FocusEvent) => {
        onFocus?.(e);
        placeCaretAtEnd();
      },
      [onFocus, placeCaretAtEnd],
    );

    const handleSelectionChange = useCallback(
      (e: TextInputSelectionChangeEvent) => {
        setSelection(e.nativeEvent.selection);
      },
      [],
    );

    return (
      <TextField
        {...props}
        value={value}
        onBlur={onBlurHandler}
        onFocus={onFocusHandler}
        inputRef={assignRef}
        inputProps={{
          ...inputProps,
          selection,
          onSelectionChange: handleSelectionChange,
        }}
      />
    );
  },
);

export default SrpInput;
