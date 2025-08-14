import React, {
  useCallback,
  useState,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { TextInput } from 'react-native';
import {
  Box,
  Text,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  TextColor,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import TextField from '../../../../../component-library/components/Form/TextField';
import { TextFieldSize } from '../../../../../component-library/components/Form/TextField/TextField.types';
import ClipboardManager from '../../../../../core/ClipboardManager';

export interface RecipientInputRef {
  focus: () => void;
  clear: () => void;
  getValue: () => string;
}

export interface RecipientInputProps {
  /**
   * Current value of the address input
   */
  value?: string;

  /**
   * Callback when the input value changes
   */
  onChangeText: (text: string) => void;

  /**
   * Custom ref for the text input
   */
  inputRef?: React.RefObject<TextInput>;
}

export const RecipientInput = forwardRef<
  RecipientInputRef,
  RecipientInputProps
>(({ value: externalValue, onChangeText, inputRef: externalInputRef }, ref) => {
  // Internal state for when no external value is provided
  const [internalValue, setInternalValue] = useState('');
  const internalInputRef = useRef<TextInput>(null);

  // Use external value if provided, otherwise use internal state
  const addressInput =
    externalValue !== undefined ? externalValue : internalValue;
  const setAddressInput = onChangeText || setInternalValue;
  const textInputRef = externalInputRef || internalInputRef;

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textInputRef.current?.focus();
    },
    clear: () => {
      setAddressInput('');
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    },
    getValue: () => addressInput,
  }));

  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await ClipboardManager.getString();
      if (clipboardText) {
        setAddressInput(clipboardText.trim());
        // Keep focus after pasting
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }, [setAddressInput, textInputRef]);

  const handleClearInput = useCallback(() => {
    setAddressInput('');
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  }, [setAddressInput, textInputRef]);

  const defaultStartAccessory = useMemo(
    () => <Text color={TextColor.TextAlternative}>{strings('send.to')}</Text>,
    [],
  );

  const renderEndAccessory = useMemo(() => {
    if (addressInput.length > 0) {
      return (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Sm}
          twClassName="-mr-2"
          onPress={handleClearInput}
        >
          {strings('send.clear')}
        </Button>
      );
    }
    return (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonBaseSize.Sm}
        twClassName="-mr-2"
        onPress={handlePaste}
      >
        {strings('send.paste')}
      </Button>
    );
  }, [addressInput.length, handleClearInput, handlePaste]);

  return (
    <Box twClassName="w-full px-4 py-2">
      <TextField
        autoCorrect={false}
        ref={textInputRef}
        value={addressInput}
        onChangeText={setAddressInput}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="none"
        placeholder={strings('send.enter_address_to_send_to')}
        size={TextFieldSize.Lg}
        endAccessory={renderEndAccessory}
        startAccessory={defaultStartAccessory}
        autoFocus={false}
      />
    </Box>
  );
});
