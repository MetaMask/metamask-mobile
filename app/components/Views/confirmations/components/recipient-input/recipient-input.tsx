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
  inputRef?: React.RefObject<TextInput>;
  onChangeText: (text: string) => void;
  value?: string;
}

export const RecipientInput = forwardRef<
  RecipientInputRef,
  RecipientInputProps
>(({ value: externalValue, onChangeText, inputRef: externalInputRef }, ref) => {
  const [internalValue, setInternalValue] = useState('');
  const internalInputRef = useRef<TextInput>(null);

  const addressInput =
    externalValue !== undefined ? externalValue : internalValue;
  const setAddressInput = onChangeText || setInternalValue;
  const textInputRef = externalInputRef || internalInputRef;

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
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      // Might consider showing an alert here if pasting fails
      // for now just ignore it
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
